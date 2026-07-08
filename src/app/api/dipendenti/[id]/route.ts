import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

// GET /api/dipendenti/:id — single dipendente with config
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
          d.id, d.matricola, d.nome, d.des_reparto, d.des_contratto,
          d.data_inizio, d.data_fine, d.des_programma, d.ore_settimanali,
          d.id_reparto, d.id_contratto, d.id_mansione, d.id_programma,
          c.id            AS cfg_id,
          c.codice_fiscale,
          c.email,
          c.telefono,
          c.tipo_rapporto,
          c.pausa_minuti,
          c.pausa_soglia_ore,
          c.pausa_auto,
          c.flg_bop,
          c.flg_boa,
          c.flg_bos,
          c.tipo_assunzione,
          c.stagionale_gia_censito,
          c.kronos_badge,
          c.kronos_attivo
        FROM CFXX_HR_ANAG_DIP d
        LEFT JOIN CFXX_HR_DIP_CONFIG c ON c.dip_id = d.id
        WHERE d.id = @id
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json({ error: 'Dipendente non trovato' }, { status: 404 });
    }

    const r = result.recordset[0];
    const row = {
      id: r.id,
      matricola: r.matricola,
      nome: r.nome,
      des_reparto: r.des_reparto,
      des_contratto: r.des_contratto,
      data_inizio: r.data_inizio,
      data_fine: r.data_fine,
      des_programma: r.des_programma,
      ore_settimanali: r.ore_settimanali,
      id_reparto: r.id_reparto,
      id_contratto: r.id_contratto,
      id_mansione: r.id_mansione,
      id_programma: r.id_programma,
      config: r.cfg_id != null
        ? {
            id: r.cfg_id,
            dip_id: r.id,
            codice_fiscale: r.codice_fiscale ?? null,
            email: r.email ?? null,
            telefono: r.telefono ?? null,
            tipo_rapporto: r.tipo_rapporto ?? null,
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
          }
        : null,
    };

    return NextResponse.json(row);
  } catch (err: any) {
    console.error('[API] GET /api/dipendenti/[id] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/dipendenti/:id — update dati base in CFXX_HR_ANAG_DIP (nome, reparto, ecc.)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const pool = await getPool();

    const sets: string[] = [];
    const request = pool.request().input('id', sql.Int, Number(id));

    if (body.nome != null) { request.input('nome', sql.NVarChar(255), body.nome); sets.push('nome = @nome'); }
    if (body.des_reparto !== undefined) { request.input('des_reparto', sql.NVarChar(255), body.des_reparto); sets.push('des_reparto = @des_reparto'); }
    if (body.id_reparto !== undefined) { request.input('id_reparto', sql.Float, body.id_reparto); sets.push('id_reparto = @id_reparto'); }
    if (body.des_contratto != null) { request.input('des_contratto', sql.NVarChar(255), body.des_contratto); sets.push('des_contratto = @des_contratto'); }
    if (body.ore_settimanali != null) { request.input('ore_settimanali', sql.Float, body.ore_settimanali); sets.push('ore_settimanali = @ore_settimanali'); }
    if (body.des_programma !== undefined) { request.input('des_programma', sql.NVarChar(255), body.des_programma); sets.push('des_programma = @des_programma'); }
    if (body.data_inizio !== undefined) { request.input('data_inizio', sql.DateTime, body.data_inizio); sets.push('data_inizio = @data_inizio'); }
    if (body.data_fine !== undefined) { request.input('data_fine', sql.DateTime, body.data_fine); sets.push('data_fine = @data_fine'); }

    if (sets.length === 0) return NextResponse.json({ ok: true });

    await request.query(`UPDATE CFXX_HR_ANAG_DIP SET ${sets.join(', ')} WHERE id = @id`);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[API] PATCH /api/dipendenti/[id] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT /api/dipendenti/:id — update config fields
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const dipId = Number(id);
    const pool = await getPool();

    // Check if config exists
    const existing = await pool
      .request()
      .input('dip_id', sql.Int, dipId)
      .query('SELECT id FROM CFXX_HR_DIP_CONFIG WHERE dip_id = @dip_id');

    if (existing.recordset.length === 0) {
      // Create config first
      await pool
        .request()
        .input('dip_id', sql.Int, dipId)
        .input('codice_fiscale', sql.NVarChar(16), body.codice_fiscale ?? null)
        .input('email', sql.NVarChar(255), body.email ?? null)
        .input('telefono', sql.NVarChar(50), body.telefono ?? null)
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
        .input('kronos_attivo', sql.Bit, body.kronos_attivo ? 1 : 0)
        .query(`
          INSERT INTO CFXX_HR_DIP_CONFIG
            (dip_id, codice_fiscale, email, telefono, tipo_rapporto,
             pausa_minuti, pausa_soglia_ore, pausa_auto,
             flg_bop, flg_boa, flg_bos, tipo_assunzione, stagionale_gia_censito,
             kronos_badge, kronos_attivo, data_ins)
          VALUES
            (@dip_id, @codice_fiscale, @email, @telefono, @tipo_rapporto,
             @pausa_minuti, @pausa_soglia_ore, @pausa_auto,
             @flg_bop, @flg_boa, @flg_bos, @tipo_assunzione, @stagionale_gia_censito,
             @kronos_badge, @kronos_attivo, GETDATE())
        `);
    } else {
      // Update existing config
      await pool
        .request()
        .input('dip_id', sql.Int, dipId)
        .input('codice_fiscale', sql.NVarChar(16), body.codice_fiscale ?? null)
        .input('email', sql.NVarChar(255), body.email ?? null)
        .input('telefono', sql.NVarChar(50), body.telefono ?? null)
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
        .input('kronos_attivo', sql.Bit, body.kronos_attivo ? 1 : 0)
        .query(`
          UPDATE CFXX_HR_DIP_CONFIG SET
            codice_fiscale = @codice_fiscale,
            email = @email,
            telefono = @telefono,
            tipo_rapporto = @tipo_rapporto,
            pausa_minuti = @pausa_minuti,
            pausa_soglia_ore = @pausa_soglia_ore,
            pausa_auto = @pausa_auto,
            flg_bop = @flg_bop,
            flg_boa = @flg_boa,
            flg_bos = @flg_bos,
            tipo_assunzione = @tipo_assunzione,
            stagionale_gia_censito = @stagionale_gia_censito,
            kronos_badge = @kronos_badge,
            kronos_attivo = @kronos_attivo,
            data_mod = GETDATE()
          WHERE dip_id = @dip_id
        `);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[API] PUT /api/dipendenti/[id] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
