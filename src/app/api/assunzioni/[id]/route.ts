import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

// GET /api/assunzioni/:id
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pool = await getPool();

    const result = await pool
      .request()
      .input('id', sql.Int, Number(id))
      .query(`
        SELECT
          a.*,
          r.des_reparto,
          c.Nome AS des_contratto
        FROM CFXX_HR_ASSUNZIONI a
        LEFT JOIN CFXX_HR_REPARTI r ON r.cod_reparto = a.id_reparto
        LEFT JOIN CFXX_PrimedOps_Contratti c ON c.ID = a.id_contratto
        WHERE a.id = @id
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json({ error: 'Assunzione non trovata' }, { status: 404 });
    }

    const r = result.recordset[0];
    return NextResponse.json({
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
    });
  } catch (err: any) {
    console.error('[API] GET /api/assunzioni/[id] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT /api/assunzioni/:id — update any field including checklist booleans
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const pool = await getPool();

    // Build dynamic SET clause based on provided fields
    const allowedFields: Record<string, { type: any; isBoolean?: boolean }> = {
      tipo: { type: sql.NVarChar(20) },
      stato: { type: sql.NVarChar(20) },
      nome: { type: sql.NVarChar(100) },
      cognome: { type: sql.NVarChar(100) },
      codice_fiscale: { type: sql.NVarChar(16) },
      email: { type: sql.NVarChar(200) },
      telefono: { type: sql.NVarChar(30) },
      data_assunzione: { type: sql.Date },
      data_fine_contratto: { type: sql.Date },
      id_contratto: { type: sql.Int },
      id_reparto: { type: sql.Int },
      ore_settimanali: { type: sql.Decimal(5, 2) },
      tipo_rapporto: { type: sql.NVarChar(20) },
      causale_contratto: { type: sql.NVarChar(100) },
      mesi_residui_24: { type: sql.Int },
      superato_12_mesi: { type: sql.Bit, isBoolean: true },
      kronos_riattivato: { type: sql.Bit, isBoolean: true },
      badge_assegnato: { type: sql.Bit, isBoolean: true },
      orario_configurato: { type: sql.Bit, isBoolean: true },
      doc_carta_identita: { type: sql.Bit, isBoolean: true },
      doc_codice_fiscale: { type: sql.Bit, isBoolean: true },
      doc_c2_storico: { type: sql.Bit, isBoolean: true },
      visita_medica_richiesta: { type: sql.Bit, isBoolean: true },
      visita_medica_effettuata: { type: sql.Bit, isBoolean: true },
      formazione_richiesta: { type: sql.Bit, isBoolean: true },
      formazione_effettuata: { type: sql.Bit, isBoolean: true },
      scheda_tecsam_generata: { type: sql.Bit, isBoolean: true },
      scheda_tecsam_inviata: { type: sql.Bit, isBoolean: true },
      sync_gestionale: { type: sql.Bit, isBoolean: true },
      sync_kronos: { type: sql.Bit, isBoolean: true },
      sync_anagrafica: { type: sql.Bit, isBoolean: true },
      dip_id: { type: sql.Int },
      creato_da: { type: sql.NVarChar(100) },
      note: { type: sql.NVarChar(sql.MAX) },
    };

    const setClauses: string[] = [];
    const request = pool.request().input('id', sql.Int, Number(id));

    for (const [field, config] of Object.entries(allowedFields)) {
      if (body[field] !== undefined) {
        const value = config.isBoolean ? (body[field] ? 1 : 0) : (body[field] ?? null);
        request.input(field, config.type, value);
        setClauses.push(`${field} = @${field}`);
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: 'Nessun campo da aggiornare' }, { status: 400 });
    }

    setClauses.push('data_mod = GETDATE()');

    await request.query(`
      UPDATE CFXX_HR_ASSUNZIONI
      SET ${setClauses.join(', ')}
      WHERE id = @id
    `);

    // Return updated record
    const updated = await pool
      .request()
      .input('id', sql.Int, Number(id))
      .query(`
        SELECT a.*, r.des_reparto, c.Nome AS des_contratto
        FROM CFXX_HR_ASSUNZIONI a
        LEFT JOIN CFXX_HR_REPARTI r ON r.cod_reparto = a.id_reparto
        LEFT JOIN CFXX_PrimedOps_Contratti c ON c.ID = a.id_contratto
        WHERE a.id = @id
      `);

    if (updated.recordset.length === 0) {
      return NextResponse.json({ error: 'Assunzione non trovata' }, { status: 404 });
    }

    const r = updated.recordset[0];
    return NextResponse.json({
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
    });
  } catch (err: any) {
    console.error('[API] PUT /api/assunzioni/[id] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/assunzioni/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pool = await getPool();

    // Delete related documents first
    await pool
      .request()
      .input('assunzione_id', sql.Int, Number(id))
      .query('DELETE FROM CFXX_HR_DOCUMENTI WHERE assunzione_id = @assunzione_id');

    const result = await pool
      .request()
      .input('id', sql.Int, Number(id))
      .query('DELETE FROM CFXX_HR_ASSUNZIONI WHERE id = @id');

    if (result.rowsAffected[0] === 0) {
      return NextResponse.json({ error: 'Assunzione non trovata' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[API] DELETE /api/assunzioni/[id] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
