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
  if (!table) return NextResponse.json({ error: 'table param required' }, { status: 400 });

  try {
    const pool = await sql.connect(config);
    const cols = await pool.query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = '${table}'
      ORDER BY ORDINAL_POSITION
    `);
    const count = await pool.query(`SELECT COUNT(*) as cnt FROM [${table}]`);
    await pool.close();
    return NextResponse.json({
      table,
      rowCount: count.recordset[0].cnt,
      columns: cols.recordset,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
