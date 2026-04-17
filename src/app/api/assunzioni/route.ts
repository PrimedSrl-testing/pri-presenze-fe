import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

// GET /api/assunzioni?stato=in_corso
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const stato = searchParams.get('stato');

    const pool = await getPool();
    const request = pool.request();

    let whereClause = '1=1';
    if (stato) {
      request.input('stato', sql.NVarChar(20), stato);
      whereClause = 'a.stato = @stato';
    }

    const result = await request.query(`
      SELECT
        a.*,
        r.des_reparto,
        c.Nome AS des_contratto
      FROM CFXX_HR_ASSUNZIONI a
      LEFT JOIN CFXX_HR_REPARTI r ON r.cod_reparto = a.id_reparto
      LEFT JOIN CFXX_PrimedOps_Contratti c ON c.ID = a.id_contratto
      WHERE ${whereClause}
      ORDER BY a.data_ins DESC
    `);

    // Cast bit fields to boolean
    const rows = result.recordset.map((r: any) => ({
      ...r,
      superato_12_mesi: !!r.superato_12_mesi,
      kronos_riattivato: !!r.kronos_riattivato,
      badge_assegnato: !!r.badge_assegnato,
      orario_configurato: !!r.orario_configurato,
      doc_carta_identita: !!r.doc_carta_identita,
      doc_codice_fiscale: !!r.doc_codice_fiscale,
      doc_c2_storico: !!r.doc_c2_storico,
      visita_medica_richiesta: !!r.visita_medica_richiesta,
      visita_medica_effettuata: !!r.visita_medica_effettuata,
      formazione_richiesta: !!r.formazione_richiesta,
      formazione_effettuata: !!r.formazione_effettuata,
      scheda_tecsam_generata: !!r.scheda_tecsam_generata,
      scheda_tecsam_inviata: !!r.scheda_tecsam_inviata,
      sync_gestionale: !!r.sync_gestionale,
      sync_kronos: !!r.sync_kronos,
      sync_anagrafica: !!r.sync_anagrafica,
    }));

    return NextResponse.json(rows);
  } catch (err: any) {
    console.error('[API] GET /api/assunzioni error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/assunzioni — create new
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pool = await getPool();

    const result = await pool
      .request()
      .input('tipo', sql.NVarChar(20), body.tipo)
      .input('stato', sql.NVarChar(20), body.stato ?? 'bozza')
      .input('nome', sql.NVarChar(100), body.nome)
      .input('cognome', sql.NVarChar(100), body.cognome)
      .input('codice_fiscale', sql.NVarChar(16), body.codice_fiscale ?? null)
      .input('email', sql.NVarChar(200), body.email ?? null)
      .input('telefono', sql.NVarChar(30), body.telefono ?? null)
      .input('data_assunzione', sql.Date, body.data_assunzione ?? null)
      .input('data_fine_contratto', sql.Date, body.data_fine_contratto ?? null)
      .input('id_contratto', sql.Int, body.id_contratto ?? null)
      .input('id_reparto', sql.Int, body.id_reparto ?? null)
      .input('ore_settimanali', sql.Decimal(5, 2), body.ore_settimanali ?? null)
      .input('tipo_rapporto', sql.NVarChar(20), body.tipo_rapporto ?? null)
      .input('causale_contratto', sql.NVarChar(100), body.causale_contratto ?? null)
      .input('mesi_residui_24', sql.Int, body.mesi_residui_24 ?? null)
      .input('superato_12_mesi', sql.Bit, body.superato_12_mesi ? 1 : 0)
      .input('kronos_riattivato', sql.Bit, body.kronos_riattivato ? 1 : 0)
      .input('badge_assegnato', sql.Bit, body.badge_assegnato ? 1 : 0)
      .input('orario_configurato', sql.Bit, body.orario_configurato ? 1 : 0)
      .input('doc_carta_identita', sql.Bit, body.doc_carta_identita ? 1 : 0)
      .input('doc_codice_fiscale', sql.Bit, body.doc_codice_fiscale ? 1 : 0)
      .input('doc_c2_storico', sql.Bit, body.doc_c2_storico ? 1 : 0)
      .input('visita_medica_richiesta', sql.Bit, body.visita_medica_richiesta ? 1 : 0)
      .input('visita_medica_effettuata', sql.Bit, body.visita_medica_effettuata ? 1 : 0)
      .input('formazione_richiesta', sql.Bit, body.formazione_richiesta ? 1 : 0)
      .input('formazione_effettuata', sql.Bit, body.formazione_effettuata ? 1 : 0)
      .input('scheda_tecsam_generata', sql.Bit, body.scheda_tecsam_generata ? 1 : 0)
      .input('scheda_tecsam_inviata', sql.Bit, body.scheda_tecsam_inviata ? 1 : 0)
      .input('sync_gestionale', sql.Bit, body.sync_gestionale ? 1 : 0)
      .input('sync_kronos', sql.Bit, body.sync_kronos ? 1 : 0)
      .input('sync_anagrafica', sql.Bit, body.sync_anagrafica ? 1 : 0)
      .input('dip_id', sql.Int, body.dip_id ?? null)
      .input('creato_da', sql.NVarChar(100), body.creato_da ?? null)
      .input('note', sql.NVarChar(sql.MAX), body.note ?? null)
      .query(`
        INSERT INTO CFXX_HR_ASSUNZIONI
          (tipo, stato, nome, cognome, codice_fiscale, email, telefono,
           data_assunzione, data_fine_contratto, id_contratto, id_reparto,
           ore_settimanali, tipo_rapporto, causale_contratto, mesi_residui_24,
           superato_12_mesi, kronos_riattivato, badge_assegnato, orario_configurato,
           doc_carta_identita, doc_codice_fiscale, doc_c2_storico,
           visita_medica_richiesta, visita_medica_effettuata,
           formazione_richiesta, formazione_effettuata,
           scheda_tecsam_generata, scheda_tecsam_inviata,
           sync_gestionale, sync_kronos, sync_anagrafica,
           dip_id, creato_da, note, data_ins)
        OUTPUT INSERTED.*
        VALUES
          (@tipo, @stato, @nome, @cognome, @codice_fiscale, @email, @telefono,
           @data_assunzione, @data_fine_contratto, @id_contratto, @id_reparto,
           @ore_settimanali, @tipo_rapporto, @causale_contratto, @mesi_residui_24,
           @superato_12_mesi, @kronos_riattivato, @badge_assegnato, @orario_configurato,
           @doc_carta_identita, @doc_codice_fiscale, @doc_c2_storico,
           @visita_medica_richiesta, @visita_medica_effettuata,
           @formazione_richiesta, @formazione_effettuata,
           @scheda_tecsam_generata, @scheda_tecsam_inviata,
           @sync_gestionale, @sync_kronos, @sync_anagrafica,
           @dip_id, @creato_da, @note, GETDATE())
      `);

    return NextResponse.json(result.recordset[0], { status: 201 });
  } catch (err: any) {
    console.error('[API] POST /api/assunzioni error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
