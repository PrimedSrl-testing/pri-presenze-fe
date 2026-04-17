import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/dipendenti/:id/orario — Assegnazione orario del dipendente
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const pool = await getPool();

    const result = await pool
      .request()
      .input('dip_id', sql.Int, Number(id))
      .query(`
        SELECT o.*, t.nome AS template_nome, t.num_settimane
        FROM CFXX_HR_DIP_ORARIO o
        LEFT JOIN CFXX_HR_ORARI_TEMPLATE t ON t.id = o.template_id
        WHERE o.dip_id = @dip_id
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json(null);
    }

    const row = result.recordset[0];
    return NextResponse.json({
      id: row.id,
      dip_id: row.dip_id,
      template_id: row.template_id,
      data_inizio_ciclo: row.data_inizio_ciclo,
      attivo: !!row.attivo,
      note: row.note,
      template_nome: row.template_nome,
      num_settimane: row.num_settimane,
    });
  } catch (err: any) {
    console.error('[API] GET /api/dipendenti/:id/orario error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT /api/dipendenti/:id/orario — Upsert assegnazione orario
export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const dipId = Number(id);
    const body = await req.json();
    const pool = await getPool();

    // Upsert via MERGE
    await pool
      .request()
      .input('dip_id', sql.Int, dipId)
      .input('template_id', sql.Int, body.template_id)
      .input('data_inizio_ciclo', sql.Date, body.data_inizio_ciclo)
      .input('attivo', sql.Bit, body.attivo ?? true)
      .input('note', sql.NVarChar(500), body.note ?? null)
      .query(`
        MERGE CFXX_HR_DIP_ORARIO AS target
        USING (SELECT @dip_id AS dip_id) AS source
        ON target.dip_id = source.dip_id
        WHEN MATCHED THEN
          UPDATE SET
            template_id = @template_id,
            data_inizio_ciclo = @data_inizio_ciclo,
            attivo = @attivo,
            note = @note,
            data_mod = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (dip_id, template_id, data_inizio_ciclo, attivo, note)
          VALUES (@dip_id, @template_id, @data_inizio_ciclo, @attivo, @note);
      `);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[API] PUT /api/dipendenti/:id/orario error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
