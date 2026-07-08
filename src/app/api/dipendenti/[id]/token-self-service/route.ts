import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

// POST /api/dipendenti/:id/token-self-service — Genera o rigenera token
export async function POST(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;

    // Genera token random
    const token = [...Array(32)].map(() => Math.random().toString(36)[2]).join('');

    const pool = await getPool();

    // Verifica config esiste
    const existing = await pool.request().input('dip_id', sql.Int, Number(id))
      .query('SELECT id FROM CFXX_HR_DIP_CONFIG WHERE dip_id = @dip_id');

    if (existing.recordset.length === 0) {
      await pool.request().input('dip_id', sql.Int, Number(id))
        .input('token', sql.NVarChar(100), token)
        .query(`INSERT INTO CFXX_HR_DIP_CONFIG (dip_id, token_self_service) VALUES (@dip_id, @token)`);
    } else {
      await pool.request().input('dip_id', sql.Int, Number(id))
        .input('token', sql.NVarChar(100), token)
        .query(`UPDATE CFXX_HR_DIP_CONFIG SET token_self_service = @token WHERE dip_id = @dip_id`);
    }

    return NextResponse.json({ token });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — Revoca token
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const pool = await getPool();
    await pool.request().input('dip_id', sql.Int, Number(id))
      .query(`UPDATE CFXX_HR_DIP_CONFIG SET token_self_service = NULL WHERE dip_id = @dip_id`);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
