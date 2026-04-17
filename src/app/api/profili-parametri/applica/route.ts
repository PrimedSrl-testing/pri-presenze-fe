import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

// POST /api/profili-parametri/applica
// Applica i profili parametri a tutti i dipendenti che matchano i filtri.
// Per ogni dipendente: trova il profilo con priorita piu alta che matcha, e aggiorna la config.
// Body opzionale: { dip_id?: number } per applicare a un singolo dipendente (usato all'inserimento)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const pool = await getPool();

    // 1. Carica profili attivi ordinati per priorita DESC
    const profiliRes = await pool.request().query(
      `SELECT * FROM CFXX_HR_PROFILI_PARAMETRI WHERE attivo = 1 ORDER BY priorita DESC`
    );
    const profili = profiliRes.recordset;

    if (profili.length === 0) {
      return NextResponse.json({ message: 'Nessun profilo attivo', applicati: 0 });
    }

    // 2. Carica dipendenti (tutti o uno solo)
    let dipQuery = `
      SELECT d.id, d.des_contratto, d.ore_settimanali,
             c.tipo_rapporto
      FROM CFXX_HR_ANAG_DIP d
      LEFT JOIN CFXX_HR_DIP_CONFIG c ON c.dip_id = d.id
    `;
    const dipRequest = pool.request();
    if (body.dip_id) {
      dipQuery += ' WHERE d.id = @dip_id';
      dipRequest.input('dip_id', sql.Int, body.dip_id);
    }
    const dipRes = await dipRequest.query(dipQuery);
    const dipendenti = dipRes.recordset;

    let applicati = 0;
    const dettagli: { dip_id: number; profilo: string }[] = [];

    // 3. Per ogni dipendente, trova il primo profilo che matcha
    for (const dip of dipendenti) {
      const profilo = profili.find((p: any) => {
        // Filtro tipo contratto (contiene, case insensitive)
        if (p.filtro_tipo_contratto) {
          const filtro = p.filtro_tipo_contratto.toUpperCase();
          const contratto = (dip.des_contratto ?? '').toUpperCase();
          if (!contratto.includes(filtro)) return false;
        }
        // Filtro tipo rapporto
        if (p.filtro_tipo_rapporto) {
          if ((dip.tipo_rapporto ?? '') !== p.filtro_tipo_rapporto) return false;
        }
        // Filtro ore da/a
        const ore = Number(dip.ore_settimanali ?? 0);
        if (p.filtro_ore_da != null && ore < Number(p.filtro_ore_da)) return false;
        if (p.filtro_ore_a != null && ore > Number(p.filtro_ore_a)) return false;

        return true;
      });

      if (!profilo) continue;

      // 4. Applica: upsert config con i parametri del profilo
      // Prima verifica se config esiste
      const cfgExists = await pool.request()
        .input('dip_id', sql.Int, dip.id)
        .query('SELECT id FROM CFXX_HR_DIP_CONFIG WHERE dip_id = @dip_id');

      const params = {
        regole_pausa: profilo.regole_pausa,
        pausa_minuti: profilo.pausa_minuti,
        pausa_soglia_ore: profilo.pausa_soglia_ore,
        pausa_auto: profilo.pausa_auto,
      };

      if (cfgExists.recordset.length > 0) {
        await pool.request()
          .input('dip_id', sql.Int, dip.id)
          .input('regole_pausa', sql.NVarChar(sql.MAX), params.regole_pausa)
          .input('pausa_minuti', sql.Int, params.pausa_minuti)
          .input('pausa_soglia_ore', sql.Decimal(4, 2), params.pausa_soglia_ore)
          .input('pausa_auto', sql.Bit, params.pausa_auto ? 1 : 0)
          .query(`
            UPDATE CFXX_HR_DIP_CONFIG SET
              regole_pausa = @regole_pausa,
              pausa_minuti = @pausa_minuti,
              pausa_soglia_ore = @pausa_soglia_ore,
              pausa_auto = @pausa_auto,
              data_mod = GETDATE()
            WHERE dip_id = @dip_id
          `);
      } else {
        await pool.request()
          .input('dip_id', sql.Int, dip.id)
          .input('regole_pausa', sql.NVarChar(sql.MAX), params.regole_pausa)
          .input('pausa_minuti', sql.Int, params.pausa_minuti)
          .input('pausa_soglia_ore', sql.Decimal(4, 2), params.pausa_soglia_ore)
          .input('pausa_auto', sql.Bit, params.pausa_auto ? 1 : 0)
          .query(`
            INSERT INTO CFXX_HR_DIP_CONFIG (dip_id, regole_pausa, pausa_minuti, pausa_soglia_ore, pausa_auto)
            VALUES (@dip_id, @regole_pausa, @pausa_minuti, @pausa_soglia_ore, @pausa_auto)
          `);
      }

      // 5. Applica regole eccesso/deficit nella tabella DIP_REGOLE
      const regExists = await pool.request()
        .input('dip_id', sql.Int, dip.id)
        .query('SELECT id FROM CFXX_HR_DIP_REGOLE WHERE dip_id = @dip_id');

      if (regExists.recordset.length > 0) {
        await pool.request()
          .input('dip_id', sql.Int, dip.id)
          .input('ft_eccesso_pipeline', sql.NVarChar(sql.MAX), profilo.eccesso_pipeline)
          .input('pt_eccesso_pipeline', sql.NVarChar(sql.MAX), profilo.eccesso_pipeline)
          .input('deficit_pipeline', sql.NVarChar(sql.MAX), profilo.deficit_pipeline)
          .input('straordinario_max_sett', sql.Decimal(5, 2), profilo.straordinario_max_sett)
          .input('straordinario_max_giorno', sql.Decimal(5, 2), profilo.straordinario_max_giorno)
          .input('straordinario_priorita_sabato', sql.Bit, profilo.straordinario_priorita_sabato ? 1 : 0)
          .query(`
            UPDATE CFXX_HR_DIP_REGOLE SET
              ft_eccesso_pipeline=@ft_eccesso_pipeline,
              pt_eccesso_pipeline=@pt_eccesso_pipeline,
              deficit_pipeline=@deficit_pipeline,
              straordinario_max_sett=@straordinario_max_sett,
              straordinario_max_giorno=@straordinario_max_giorno,
              straordinario_priorita_sabato=@straordinario_priorita_sabato,
              data_mod=GETDATE()
            WHERE dip_id=@dip_id
          `);
      } else {
        await pool.request()
          .input('dip_id', sql.Int, dip.id)
          .input('ft_eccesso_pipeline', sql.NVarChar(sql.MAX), profilo.eccesso_pipeline)
          .input('pt_eccesso_pipeline', sql.NVarChar(sql.MAX), profilo.eccesso_pipeline)
          .input('deficit_pipeline', sql.NVarChar(sql.MAX), profilo.deficit_pipeline)
          .input('straordinario_max_sett', sql.Decimal(5, 2), profilo.straordinario_max_sett)
          .input('straordinario_max_giorno', sql.Decimal(5, 2), profilo.straordinario_max_giorno)
          .input('straordinario_priorita_sabato', sql.Bit, profilo.straordinario_priorita_sabato ? 1 : 0)
          .query(`
            INSERT INTO CFXX_HR_DIP_REGOLE
              (dip_id, ft_eccesso_pipeline, pt_eccesso_pipeline, deficit_pipeline,
               straordinario_max_sett, straordinario_max_giorno, straordinario_priorita_sabato)
            VALUES
              (@dip_id, @ft_eccesso_pipeline, @pt_eccesso_pipeline, @deficit_pipeline,
               @straordinario_max_sett, @straordinario_max_giorno, @straordinario_priorita_sabato)
          `);
      }

      applicati++;
      dettagli.push({ dip_id: dip.id, profilo: profilo.nome });
    }

    return NextResponse.json({ applicati, dettagli });
  } catch (err: any) {
    console.error('[API] POST /api/profili-parametri/applica error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
