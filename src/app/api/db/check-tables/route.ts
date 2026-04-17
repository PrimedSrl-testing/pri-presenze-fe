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

export async function GET() {
  try {
    const pool = await sql.connect(config);
    const result = await pool.query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);
    await pool.close();
    return NextResponse.json({ tables: result.recordset.map((r: any) => r.TABLE_NAME) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
