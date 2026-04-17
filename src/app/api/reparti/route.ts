import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

// GET /api/reparti — list all reparti
export async function GET() {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT cod_reparto, des_reparto, num_ord, flg_abil, userid
      FROM CFXX_HR_REPARTI
      ORDER BY num_ord, des_reparto
    `);

    return NextResponse.json(result.recordset);
  } catch (err: any) {
    console.error('[API] GET /api/reparti error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
