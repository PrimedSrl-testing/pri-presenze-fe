import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/dipendenti/:id/bop-movimenti
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const pool = await getPool();
    const result = await pool
      .request()
      .input('dip_id', sql.Int, Number(id))
      .query(`
        SELECT * FROM CFXX_HR_BOP_MOVIMENTI
        WHERE dip_id = @dip_id
        ORDER BY data_movimento DESC, id DESC
      `);

    // Calcola saldo
    const movimenti = result.recordset.map((r: any) => ({
      id: r.id, dip_id: r.dip_id,
      data_movimento: r.data_movimento,
      tipo: r.tipo,
      ore: Number(r.ore),
      motivazione: r.motivazione,
      creato_da: r.creato_da,
      data_ins: r.data_ins,
    }));

    const saldo = movimenti.reduce((acc, m) => acc + (m.tipo === 'carico' ? m.ore : -m.ore), 0);

    return NextResponse.json({ movimenti, saldo: Math.round(saldo * 100) / 100 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/dipendenti/:id/bop-movimenti — nuovo movimento (carico o scarico)
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    if (!body.tipo || !body.ore || !body.data_movimento) {
      return NextResponse.json({ error: 'tipo, ore, data_movimento obbligatori' }, { status: 400 });
    }

    const pool = await getPool();
    await pool
      .request()
      .input('dip_id', sql.Int, Number(id))
      .input('data_movimento', sql.Date, body.data_movimento)
      .input('tipo', sql.NVarChar(30), body.tipo)
      .input('ore', sql.Decimal(6, 2), body.ore)
      .input('motivazione', sql.NVarChar(500), body.motivazione ?? null)
      .input('creato_da', sql.NVarChar(100), body.creato_da ?? 'HR')
      .query(`
        INSERT INTO CFXX_HR_BOP_MOVIMENTI
          (dip_id, data_movimento, tipo, ore, motivazione, creato_da)
        VALUES (@dip_id, @data_movimento, @tipo, @ore, @motivazione, @creato_da)
      `);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/dipendenti/:id/bop-movimenti?id=XX
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const movId = searchParams.get('id');
    if (!movId) return NextResponse.json({ error: 'id obbligatorio' }, { status: 400 });

    const pool = await getPool();
    await pool.request().input('id', sql.Int, Number(movId))
      .query('DELETE FROM CFXX_HR_BOP_MOVIMENTI WHERE id = @id');

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
