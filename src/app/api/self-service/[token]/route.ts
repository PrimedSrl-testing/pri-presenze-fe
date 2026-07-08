import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

type Ctx = { params: Promise<{ token: string }> };

// GET /api/self-service/:token — Carica dati dipendente
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { token } = await ctx.params;
    if (!token || token.length < 16) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 });
    }

    const pool = await getPool();
    const result = await pool.request().input('token', sql.NVarChar(100), token)
      .query(`
        SELECT d.id, d.nome, d.matricola, d.des_reparto, d.des_contratto,
               d.data_inizio, d.ore_settimanali,
               c.*
        FROM CFXX_HR_DIP_CONFIG c
        INNER JOIN CFXX_HR_ANAG_DIP d ON d.id = c.dip_id
        WHERE c.token_self_service = @token
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json({ error: 'Link non valido o scaduto. Contatta HR.' }, { status: 404 });
    }

    const r = result.recordset[0];
    return NextResponse.json({
      dip_id: r.id,
      nome: r.nome,
      matricola: r.matricola,
      reparto: r.des_reparto,
      contratto: r.des_contratto,
      data_inizio: r.data_inizio,
      ore_settimanali: r.ore_settimanali,
      dati: {
        codice_fiscale: r.codice_fiscale, email: r.email, telefono: r.telefono, pec: r.pec,
        data_nascita: r.data_nascita, luogo_nascita: r.luogo_nascita,
        genere: r.genere, nazionalita: r.nazionalita,
        indirizzo: r.indirizzo, citta: r.citta, cap: r.cap, provincia: r.provincia,
        iban: r.iban,
        contatto_emergenza: r.contatto_emergenza, contatto_emergenza_tel: r.contatto_emergenza_tel,
        medico_famiglia: r.medico_famiglia, medico_famiglia_tel: r.medico_famiglia_tel,
        doc_ci_file: r.doc_ci_file, doc_cf_file: r.doc_cf_file,
      },
      dati_da_verificare: !!r.dati_da_verificare,
      data_autocompilazione: r.data_autocompilazione,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT /api/self-service/:token — Salva dati compilati dal dipendente
export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const { token } = await ctx.params;
    const body = await req.json();
    const pool = await getPool();

    // Verifica token
    const check = await pool.request().input('token', sql.NVarChar(100), token)
      .query('SELECT dip_id FROM CFXX_HR_DIP_CONFIG WHERE token_self_service = @token');

    if (check.recordset.length === 0) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 });
    }

    await pool.request()
      .input('token', sql.NVarChar(100), token)
      .input('codice_fiscale', sql.NVarChar(16), body.codice_fiscale ?? null)
      .input('email', sql.NVarChar(255), body.email ?? null)
      .input('telefono', sql.NVarChar(50), body.telefono ?? null)
      .input('pec', sql.NVarChar(255), body.pec ?? null)
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
      .input('medico_famiglia', sql.NVarChar(200), body.medico_famiglia ?? null)
      .input('medico_famiglia_tel', sql.NVarChar(50), body.medico_famiglia_tel ?? null)
      .query(`
        UPDATE CFXX_HR_DIP_CONFIG SET
          codice_fiscale = @codice_fiscale, email = @email, telefono = @telefono, pec = @pec,
          data_nascita = @data_nascita, luogo_nascita = @luogo_nascita,
          genere = @genere, nazionalita = @nazionalita,
          indirizzo = @indirizzo, citta = @citta, cap = @cap, provincia = @provincia,
          iban = @iban, contatto_emergenza = @contatto_emergenza,
          contatto_emergenza_tel = @contatto_emergenza_tel,
          medico_famiglia = @medico_famiglia,
          medico_famiglia_tel = @medico_famiglia_tel,
          dati_da_verificare = 1,
          data_autocompilazione = GETDATE(),
          data_mod = GETDATE()
        WHERE token_self_service = @token
      `);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
