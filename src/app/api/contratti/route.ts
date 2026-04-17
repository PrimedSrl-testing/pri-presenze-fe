import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

// GET /api/contratti — list all active contratti
export async function GET() {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT ID, Nome, OreSett, OreMese, Giorni, Attivo
      FROM CFXX_PrimedOps_Contratti
      WHERE Attivo = 1
      ORDER BY Nome
    `);

    return NextResponse.json(result.recordset);
  } catch (err: any) {
    console.error('[API] GET /api/contratti error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
