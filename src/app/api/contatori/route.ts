import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

// GET /api/contatori?anno=2026&vista=totali|reparti|dipendenti&reparto=NOME
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const anno = Number(searchParams.get('anno') ?? new Date().getFullYear());
    const vista = searchParams.get('vista') ?? 'totali';
    const reparto = searchParams.get('reparto');

    const pool = await getPool();

    if (vista === 'totali') {
      // Prendi l'ultimo mese importato per l'anno
      const lastMonth = await pool.request().input('anno', sql.Int, anno)
        .query(`SELECT ISNULL(MAX(mese), 0) AS max_mese FROM CFXX_HR_SALDI WHERE anno = @anno`);
      const mese = lastMonth.recordset[0].max_mese || 0;

      // Totali dall'ultimo mese (dati cumulativi dal consulente)
      const result = await pool
        .request()
        .input('anno', sql.Int, anno)
        .input('mese', sql.Int, mese)
        .query(`
          SELECT
            ISNULL(SUM(s.ferie_residuo), 0) AS ferie_saldo,
            ISNULL(SUM(s.ferie_ap), 0) AS ferie_ap,
            ISNULL(SUM(s.ferie_maturate), 0) AS ferie_maturate,
            ISNULL(SUM(s.ferie_usate), 0) AS ferie_usate,
            ISNULL(SUM(s.rol_residuo), 0) AS rol_saldo,
            ISNULL(SUM(s.rol_ap), 0) AS rol_ap,
            ISNULL(SUM(s.rol_maturato), 0) AS rol_maturato,
            ISNULL(SUM(s.rol_usato), 0) AS rol_usato,
            ISNULL(SUM(s.banca_ore_residuo), 0) AS banca_saldo,
            ISNULL(SUM(s.banca_ore_ap), 0) AS banca_ap,
            ISNULL(SUM(s.banca_ore), 0) AS banca_maturata,
            ISNULL(SUM(s.banca_ore_usata), 0) AS banca_usata,
            ISNULL(SUM(s.bop - s.bop_usato), 0) AS bop_saldo,
            ISNULL(SUM(s.bop), 0) AS bop_maturato,
            ISNULL(SUM(s.bop_usato), 0) AS bop_usato
          FROM CFXX_HR_SALDI s
          WHERE s.anno = @anno AND s.mese = @mese
        `);

      const r = result.recordset[0];
      const totale = Number(r.ferie_saldo) + Number(r.rol_saldo) + Number(r.banca_saldo) + Number(r.bop_saldo);

      return NextResponse.json({
        vista: 'totali',
        anno,
        totale_ore: round2(totale),
        ferie: { saldo: round2(r.ferie_saldo), maturate: round2(r.ferie_maturate), usate: round2(r.ferie_usate) },
        rol: { saldo: round2(r.rol_saldo), maturato: round2(r.rol_maturato), usato: round2(r.rol_usato) },
        banca_ore: { saldo: round2(r.banca_saldo), maturata: round2(r.banca_maturata), usata: round2(r.banca_usata) },
        bop: { saldo: round2(r.bop_saldo), maturato: round2(r.bop_maturato), usato: round2(r.bop_usato) },
      });
    }

    if (vista === 'reparti') {
      const lastMonth = await pool.request().input('anno', sql.Int, anno)
        .query(`SELECT ISNULL(MAX(mese), 0) AS max_mese FROM CFXX_HR_SALDI WHERE anno = @anno`);
      const mese = lastMonth.recordset[0].max_mese || 0;

      const result = await pool
        .request()
        .input('anno', sql.Int, anno)
        .input('mese', sql.Int, mese)
        .query(`
          SELECT
            d.des_reparto AS reparto,
            COUNT(DISTINCT d.id) AS num_dipendenti,
            ISNULL(SUM(s.ferie_residuo), 0) AS ferie_saldo,
            ISNULL(SUM(s.rol_residuo), 0) AS rol_saldo,
            ISNULL(SUM(s.banca_ore_residuo), 0) AS banca_saldo,
            ISNULL(SUM(s.bop - s.bop_usato), 0) AS bop_saldo
          FROM CFXX_HR_ANAG_DIP d
          LEFT JOIN CFXX_HR_SALDI s ON s.dip_id = d.id AND s.anno = @anno AND s.mese = @mese
          GROUP BY d.des_reparto
          ORDER BY d.des_reparto
        `);

      return NextResponse.json({
        vista: 'reparti',
        anno,
        reparti: result.recordset.map((r: any) => ({
          reparto: r.reparto ?? 'Senza reparto',
          num_dipendenti: r.num_dipendenti,
          ferie_saldo: round2(r.ferie_saldo),
          rol_saldo: round2(r.rol_saldo),
          banca_saldo: round2(r.banca_saldo),
          bop_saldo: round2(r.bop_saldo),
          totale: round2(Number(r.ferie_saldo) + Number(r.rol_saldo) + Number(r.banca_saldo) + Number(r.bop_saldo)),
        })),
      });
    }

    if (vista === 'dipendenti') {
      const lastMonth = await pool.request().input('anno', sql.Int, anno)
        .query(`SELECT ISNULL(MAX(mese), 0) AS max_mese FROM CFXX_HR_SALDI WHERE anno = @anno`);
      const mese = lastMonth.recordset[0].max_mese || 0;

      const request = pool.request().input('anno', sql.Int, anno).input('mese', sql.Int, mese);
      let where = '';
      if (reparto) {
        request.input('reparto', sql.NVarChar(255), reparto);
        where = 'AND d.des_reparto = @reparto';
      }

      const result = await request.query(`
        SELECT
          d.id AS dip_id, d.nome, d.matricola, d.des_reparto,
          ISNULL(s.ferie_ap, 0) AS ferie_ap,
          ISNULL(s.ferie_maturate, 0) AS ferie_mat,
          ISNULL(s.ferie_usate, 0) AS ferie_usa,
          ISNULL(s.ferie_residuo, 0) AS ferie_res,
          ISNULL(s.rol_ap, 0) AS rol_ap,
          ISNULL(s.rol_maturato, 0) AS rol_mat,
          ISNULL(s.rol_usato, 0) AS rol_usa,
          ISNULL(s.rol_residuo, 0) AS rol_res,
          ISNULL(s.banca_ore_ap, 0) AS banca_ap,
          ISNULL(s.banca_ore, 0) AS banca_mat,
          ISNULL(s.banca_ore_usata, 0) AS banca_usa,
          ISNULL(s.banca_ore_residuo, 0) AS banca_res,
          ISNULL(s.bop, 0) AS bop_mat,
          ISNULL(s.bop_usato, 0) AS bop_usa
        FROM CFXX_HR_ANAG_DIP d
        LEFT JOIN CFXX_HR_SALDI s ON s.dip_id = d.id AND s.anno = @anno AND s.mese = @mese
        WHERE 1=1 ${where}
        ORDER BY d.nome
      `);

      return NextResponse.json({
        vista: 'dipendenti',
        anno, mese,
        reparto: reparto ?? 'Tutti',
        dipendenti: result.recordset.map((r: any) => ({
          dip_id: r.dip_id, nome: r.nome, matricola: r.matricola, reparto: r.des_reparto,
          ferie: { ap: round2(r.ferie_ap), maturate: round2(r.ferie_mat), usate: round2(r.ferie_usa), saldo: round2(r.ferie_res) },
          rol: { ap: round2(r.rol_ap), maturato: round2(r.rol_mat), usato: round2(r.rol_usa), saldo: round2(r.rol_res) },
          banca_ore: { ap: round2(r.banca_ap), maturata: round2(r.banca_mat), usata: round2(r.banca_usa), saldo: round2(r.banca_res) },
          bop: { maturato: round2(r.bop_mat), usato: round2(r.bop_usa), saldo: round2(Number(r.bop_mat) - Number(r.bop_usa)) },
          totale: round2(Number(r.ferie_res) + Number(r.rol_res) + Number(r.banca_res) + Number(r.bop_mat) - Number(r.bop_usa)),
        })),
      });
    }

    return NextResponse.json({ error: 'vista non valida' }, { status: 400 });
  } catch (err: any) {
    console.error('[API] GET /api/contatori error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function round2(n: number): number { return Math.round(Number(n) * 100) / 100; }
