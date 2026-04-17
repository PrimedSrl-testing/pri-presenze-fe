import { NextResponse } from 'next/server';
import sql from 'mssql';

const config: sql.config = {
  server: 'MSSQL',
  database: 'PRIMED',
  user: 'primedsa',
  password: 'Primed123!',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const table = searchParams.get('table');
  const top = searchParams.get('top') || '5';
  if (!table) return NextResponse.json({ error: 'table param required' }, { status: 400 });

  try {
    const pool = await sql.connect(config);
    const result = await pool.query(`SELECT TOP ${top} * FROM [${table}]`);
    await pool.close();
    return NextResponse.json({ table, rows: result.recordset });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
