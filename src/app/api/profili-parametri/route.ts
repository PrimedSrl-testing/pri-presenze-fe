import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

// GET /api/profili-parametri
export async function GET() {
  try {
    const pool = await getPool();
    const result = await pool.request().query(
      `SELECT * FROM CFXX_HR_PROFILI_PARAMETRI ORDER BY priorita DESC, nome`
    );
    return NextResponse.json(result.recordset.map(parseRow));
  } catch (err: any) {
    console.error('[API] GET /api/profili-parametri error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/profili-parametri
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.nome) return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 });

    const pool = await getPool();
    const result = await pool
      .request()
      .input('nome', sql.NVarChar(100), body.nome)
      .input('filtro_tipo_contratto', sql.NVarChar(100), body.filtro_tipo_contratto ?? null)
      .input('filtro_tipo_rapporto', sql.NVarChar(30), body.filtro_tipo_rapporto ?? null)
      .input('filtro_ore_da', sql.Decimal(5, 2), body.filtro_ore_da ?? null)
      .input('filtro_ore_a', sql.Decimal(5, 2), body.filtro_ore_a ?? null)
      .input('regole_pausa', sql.NVarChar(sql.MAX), body.regole_pausa ? JSON.stringify(body.regole_pausa) : null)
      .input('pausa_minuti', sql.Int, body.pausa_minuti ?? 30)
      .input('pausa_soglia_ore', sql.Decimal(4, 2), body.pausa_soglia_ore ?? 8)
      .input('pausa_auto', sql.Bit, body.pausa_auto ?? true)
      .input('eccesso_pipeline', sql.NVarChar(sql.MAX), JSON.stringify(body.eccesso_pipeline ?? []))
      .input('deficit_pipeline', sql.NVarChar(sql.MAX), JSON.stringify(body.deficit_pipeline ?? []))
      .input('straordinario_max_sett', sql.Decimal(5, 2), body.straordinario_max_sett ?? 8)
      .input('straordinario_max_giorno', sql.Decimal(5, 2), body.straordinario_max_giorno ?? 2)
      .input('straordinario_priorita_sabato', sql.Bit, body.straordinario_priorita_sabato ?? true)
      .input('priorita', sql.Int, body.priorita ?? 0)
      .input('attivo', sql.Bit, body.attivo ?? true)
      .input('note', sql.NVarChar(500), body.note ?? null)
      .query(`
        INSERT INTO CFXX_HR_PROFILI_PARAMETRI
          (nome, filtro_tipo_contratto, filtro_tipo_rapporto, filtro_ore_da, filtro_ore_a,
           regole_pausa, pausa_minuti, pausa_soglia_ore, pausa_auto,
           eccesso_pipeline, deficit_pipeline,
           straordinario_max_sett, straordinario_max_giorno, straordinario_priorita_sabato,
           priorita, attivo, note)
        OUTPUT INSERTED.*
        VALUES
          (@nome, @filtro_tipo_contratto, @filtro_tipo_rapporto, @filtro_ore_da, @filtro_ore_a,
           @regole_pausa, @pausa_minuti, @pausa_soglia_ore, @pausa_auto,
           @eccesso_pipeline, @deficit_pipeline,
           @straordinario_max_sett, @straordinario_max_giorno, @straordinario_priorita_sabato,
           @priorita, @attivo, @note)
      `);

    return NextResponse.json(parseRow(result.recordset[0]), { status: 201 });
  } catch (err: any) {
    console.error('[API] POST /api/profili-parametri error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function parseRow(r: any) {
  return {
    id: r.id, nome: r.nome,
    filtro_tipo_contratto: r.filtro_tipo_contratto,
    filtro_tipo_rapporto: r.filtro_tipo_rapporto,
    filtro_ore_da: r.filtro_ore_da != null ? Number(r.filtro_ore_da) : null,
    filtro_ore_a: r.filtro_ore_a != null ? Number(r.filtro_ore_a) : null,
    regole_pausa: r.regole_pausa ? safeJSON(r.regole_pausa) : null,
    pausa_minuti: r.pausa_minuti,
    pausa_soglia_ore: Number(r.pausa_soglia_ore),
    pausa_auto: !!r.pausa_auto,
    eccesso_pipeline: safeJSON(r.eccesso_pipeline) ?? [],
    deficit_pipeline: safeJSON(r.deficit_pipeline) ?? [],
    straordinario_max_sett: Number(r.straordinario_max_sett),
    straordinario_max_giorno: Number(r.straordinario_max_giorno),
    straordinario_priorita_sabato: !!r.straordinario_priorita_sabato,
    priorita: r.priorita, attivo: !!r.attivo, note: r.note,
  };
}

function safeJSON(v: any) {
  if (!v) return null;
  try { return typeof v === 'string' ? JSON.parse(v) : v; } catch { return null; }
}
