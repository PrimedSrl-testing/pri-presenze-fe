import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

// GET /api/dipendenti/:id/config — get or create default config
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dipId = Number(id);
    const pool = await getPool();

    // Try to find existing config
    let result = await pool
      .request()
      .input('dip_id', sql.Int, dipId)
      .query('SELECT * FROM CFXX_HR_DIP_CONFIG WHERE dip_id = @dip_id');

    if (result.recordset.length === 0) {
      // Create default config
      await pool
        .request()
        .input('dip_id', sql.Int, dipId)
        .query(`
          INSERT INTO CFXX_HR_DIP_CONFIG
            (dip_id, pausa_minuti, pausa_soglia_ore, pausa_auto,
             flg_bop, flg_boa, flg_bos, tipo_assunzione, stagionale_gia_censito,
             kronos_badge, kronos_attivo, data_ins)
          VALUES
            (@dip_id, 30, 8, 1, 0, 0, 0, NULL, 0, NULL, 0, GETDATE())
        `);

      result = await pool
        .request()
        .input('dip_id', sql.Int, dipId)
        .query('SELECT * FROM CFXX_HR_DIP_CONFIG WHERE dip_id = @dip_id');
    }

    const r = result.recordset[0];
    const config = {
      id: r.id,
      dip_id: r.dip_id,
      codice_fiscale: r.codice_fiscale ?? null,
      email: r.email ?? null,
      telefono: r.telefono ?? null,
      data_nascita: r.data_nascita ?? null,
      luogo_nascita: r.luogo_nascita ?? null,
      genere: r.genere ?? null,
      nazionalita: r.nazionalita ?? null,
      indirizzo: r.indirizzo ?? null,
      citta: r.citta ?? null,
      cap: r.cap ?? null,
      provincia: r.provincia ?? null,
      iban: r.iban ?? null,
      contatto_emergenza: r.contatto_emergenza ?? null,
      contatto_emergenza_tel: r.contatto_emergenza_tel ?? null,
      pec: r.pec ?? null,
      doc_carta_identita: !!r.doc_carta_identita,
      doc_codice_fiscale: !!r.doc_codice_fiscale,
      doc_c2_storico: !!r.doc_c2_storico,
      doc_permesso_soggiorno: !!r.doc_permesso_soggiorno,
      doc_ci_file: r.doc_ci_file ?? null,
      doc_cf_file: r.doc_cf_file ?? null,
      doc_c2_file: r.doc_c2_file ?? null,
      doc_ps_file: r.doc_ps_file ?? null,
      tipo_rapporto: r.tipo_rapporto ?? null,
      regole_pausa: r.regole_pausa ? safeJSON(r.regole_pausa) : null,
      pausa_minuti: r.pausa_minuti,
      pausa_soglia_ore: r.pausa_soglia_ore,
      pausa_auto: !!r.pausa_auto,
      flg_bop: !!r.flg_bop,
      flg_boa: !!r.flg_boa,
      flg_bos: !!r.flg_bos,
      tipo_assunzione: r.tipo_assunzione,
      stagionale_gia_censito: !!r.stagionale_gia_censito,
      kronos_badge: r.kronos_badge,
      kronos_attivo: !!r.kronos_attivo,
    };

    return NextResponse.json(config);
  } catch (err: any) {
    console.error('[API] GET /api/dipendenti/[id]/config error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT /api/dipendenti/:id/config — update config
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dipId = Number(id);
    const body = await req.json();
    const pool = await getPool();

    // Ensure config row exists
    const existing = await pool
      .request()
      .input('dip_id', sql.Int, dipId)
      .query('SELECT id FROM CFXX_HR_DIP_CONFIG WHERE dip_id = @dip_id');

    const cfgInputs = (r: any) => r
      .input('regole_pausa', sql.NVarChar(sql.MAX), body.regole_pausa ? JSON.stringify(body.regole_pausa) : null)
      .input('codice_fiscale', sql.NVarChar(16), body.codice_fiscale ?? null)
      .input('email', sql.NVarChar(255), body.email ?? null)
      .input('telefono', sql.NVarChar(50), body.telefono ?? null)
      .input('data_nascita', sql.Date, body.data_nascita ?? null)
      .input('luogo_nascita', sql.NVarChar(100), body.luogo_nascita ?? null)
      .input('genere', sql.NVarChar(1), body.genere ?? null)
      .input('nazionalita', sql.NVarChar(50), body.nazionalita ?? null)
      .input('indirizzo', sql.NVarChar(255), body.indirizzo ?? null)
      .input('citta', sql.NVarChar(100), body.citta ?? null)
      .input('cap', sql.NVarChar(10), body.cap ?? null)
      .input('provincia', sql.NVarChar(5), body.provincia ?? null)
      .input('iban', sql.NVarChar(34), body.iban ?? null)
      .input('contatto_emergenza', sql.NVarChar(200), body.contatto_emergenza ?? null)
      .input('contatto_emergenza_tel', sql.NVarChar(50), body.contatto_emergenza_tel ?? null)
      .input('pec', sql.NVarChar(255), body.pec ?? null)
      .input('doc_carta_identita', sql.Bit, body.doc_carta_identita ? 1 : 0)
      .input('doc_codice_fiscale', sql.Bit, body.doc_codice_fiscale ? 1 : 0)
      .input('doc_c2_storico', sql.Bit, body.doc_c2_storico ? 1 : 0)
      .input('doc_permesso_soggiorno', sql.Bit, body.doc_permesso_soggiorno ? 1 : 0)
      .input('doc_ci_file', sql.NVarChar(500), body.doc_ci_file ?? null)
      .input('doc_cf_file', sql.NVarChar(500), body.doc_cf_file ?? null)
      .input('doc_c2_file', sql.NVarChar(500), body.doc_c2_file ?? null)
      .input('doc_ps_file', sql.NVarChar(500), body.doc_ps_file ?? null)
      .input('tipo_rapporto', sql.NVarChar(30), body.tipo_rapporto ?? null)
      .input('pausa_minuti', sql.Int, body.pausa_minuti ?? 30)
      .input('pausa_soglia_ore', sql.Decimal(5, 2), body.pausa_soglia_ore ?? 8)
      .input('pausa_auto', sql.Bit, body.pausa_auto ? 1 : 0)
      .input('flg_bop', sql.Bit, body.flg_bop ? 1 : 0)
      .input('flg_boa', sql.Bit, body.flg_boa ? 1 : 0)
      .input('flg_bos', sql.Bit, body.flg_bos ? 1 : 0)
      .input('tipo_assunzione', sql.NVarChar(20), body.tipo_assunzione ?? null)
      .input('stagionale_gia_censito', sql.Bit, body.stagionale_gia_censito ? 1 : 0)
      .input('kronos_badge', sql.NVarChar(50), body.kronos_badge ?? null)
      .input('kronos_attivo', sql.Bit, body.kronos_attivo ? 1 : 0);

    if (existing.recordset.length === 0) {
      await cfgInputs(pool.request().input('dip_id', sql.Int, dipId))
        .query(`
          INSERT INTO CFXX_HR_DIP_CONFIG
            (dip_id, codice_fiscale, email, telefono,
             data_nascita, luogo_nascita, genere, nazionalita,
             indirizzo, citta, cap, provincia, iban,
             contatto_emergenza, contatto_emergenza_tel,
             pec, doc_carta_identita, doc_codice_fiscale, doc_c2_storico, doc_permesso_soggiorno,
             doc_ci_file, doc_cf_file, doc_c2_file, doc_ps_file,
             tipo_rapporto, regole_pausa, pausa_minuti, pausa_soglia_ore, pausa_auto,
             flg_bop, flg_boa, flg_bos, tipo_assunzione, stagionale_gia_censito,
             kronos_badge, kronos_attivo, data_ins)
          VALUES
            (@dip_id, @codice_fiscale, @email, @telefono,
             @data_nascita, @luogo_nascita, @genere, @nazionalita,
             @indirizzo, @citta, @cap, @provincia, @iban,
             @contatto_emergenza, @contatto_emergenza_tel,
             @pec, @doc_carta_identita, @doc_codice_fiscale, @doc_c2_storico, @doc_permesso_soggiorno,
             @doc_ci_file, @doc_cf_file, @doc_c2_file, @doc_ps_file,
             @tipo_rapporto, @regole_pausa, @pausa_minuti, @pausa_soglia_ore, @pausa_auto,
             @flg_bop, @flg_boa, @flg_bos, @tipo_assunzione, @stagionale_gia_censito,
             @kronos_badge, @kronos_attivo, GETDATE())
        `);
    } else {
      await cfgInputs(pool.request().input('dip_id', sql.Int, dipId))
        .query(`
          UPDATE CFXX_HR_DIP_CONFIG SET
            codice_fiscale = @codice_fiscale, email = @email, telefono = @telefono,
            data_nascita = @data_nascita, luogo_nascita = @luogo_nascita,
            genere = @genere, nazionalita = @nazionalita,
            indirizzo = @indirizzo, citta = @citta, cap = @cap, provincia = @provincia,
            iban = @iban, contatto_emergenza = @contatto_emergenza,
            contatto_emergenza_tel = @contatto_emergenza_tel,
            pec = @pec,
            doc_carta_identita = @doc_carta_identita,
            doc_codice_fiscale = @doc_codice_fiscale,
            doc_c2_storico = @doc_c2_storico,
            doc_permesso_soggiorno = @doc_permesso_soggiorno,
            doc_ci_file = @doc_ci_file,
            doc_cf_file = @doc_cf_file,
            doc_c2_file = @doc_c2_file,
            doc_ps_file = @doc_ps_file,
            tipo_rapporto = @tipo_rapporto,
            regole_pausa = @regole_pausa,
            pausa_minuti = @pausa_minuti, pausa_soglia_ore = @pausa_soglia_ore,
            pausa_auto = @pausa_auto, flg_bop = @flg_bop, flg_boa = @flg_boa,
            flg_bos = @flg_bos, tipo_assunzione = @tipo_assunzione,
            stagionale_gia_censito = @stagionale_gia_censito,
            kronos_badge = @kronos_badge, kronos_attivo = @kronos_attivo,
            data_mod = GETDATE()
          WHERE dip_id = @dip_id
        `);
    }

    // Return updated config
    const updated = await pool
      .request()
      .input('dip_id', sql.Int, dipId)
      .query('SELECT * FROM CFXX_HR_DIP_CONFIG WHERE dip_id = @dip_id');

    const r = updated.recordset[0];
    return NextResponse.json({
      id: r.id,
      dip_id: r.dip_id,
      codice_fiscale: r.codice_fiscale ?? null,
      email: r.email ?? null,
      telefono: r.telefono ?? null,
      data_nascita: r.data_nascita ?? null,
      luogo_nascita: r.luogo_nascita ?? null,
      genere: r.genere ?? null,
      nazionalita: r.nazionalita ?? null,
      indirizzo: r.indirizzo ?? null,
      citta: r.citta ?? null,
      cap: r.cap ?? null,
      provincia: r.provincia ?? null,
      iban: r.iban ?? null,
      contatto_emergenza: r.contatto_emergenza ?? null,
      contatto_emergenza_tel: r.contatto_emergenza_tel ?? null,
      pec: r.pec ?? null,
      doc_carta_identita: !!r.doc_carta_identita,
      doc_codice_fiscale: !!r.doc_codice_fiscale,
      doc_c2_storico: !!r.doc_c2_storico,
      doc_permesso_soggiorno: !!r.doc_permesso_soggiorno,
      doc_ci_file: r.doc_ci_file ?? null,
      doc_cf_file: r.doc_cf_file ?? null,
      doc_c2_file: r.doc_c2_file ?? null,
      doc_ps_file: r.doc_ps_file ?? null,
      tipo_rapporto: r.tipo_rapporto ?? null,
      regole_pausa: r.regole_pausa ? safeJSON(r.regole_pausa) : null,
      pausa_minuti: r.pausa_minuti,
      pausa_soglia_ore: r.pausa_soglia_ore,
      pausa_auto: !!r.pausa_auto,
      flg_bop: !!r.flg_bop,
      flg_boa: !!r.flg_boa,
      flg_bos: !!r.flg_bos,
      tipo_assunzione: r.tipo_assunzione,
      stagionale_gia_censito: !!r.stagionale_gia_censito,
      kronos_badge: r.kronos_badge,
      kronos_attivo: !!r.kronos_attivo,
    });
  } catch (err: any) {
    console.error('[API] PUT /api/dipendenti/[id]/config error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function safeJSON(val: any) {
  if (!val) return null;
  try { return typeof val === 'string' ? JSON.parse(val) : val; }
  catch { return null; }
}
