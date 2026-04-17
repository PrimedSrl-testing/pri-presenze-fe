import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

// GET /api/tecsam/scadenze?giorni=30
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const giorni = Number(searchParams.get('giorni') ?? 90);

    const pool = await getPool();
    const result = await pool
      .request()
      .input('giorni', sql.Int, giorni)
      .query(`
        SELECT t.*, d.nome AS dip_nome, d.matricola AS matricola
        FROM CFXX_HR_TECSAM t
        LEFT JOIN CFXX_HR_ANAG_DIP d ON d.id = t.dip_id
        WHERE t.stato IN ('da_programmare', 'programmata')
          AND (
            t.data_scadenza IS NOT NULL AND t.data_scadenza <= DATEADD(DAY, @giorni, GETDATE())
            OR t.data_prossima IS NOT NULL AND t.data_prossima <= DATEADD(DAY, @giorni, GETDATE())
          )
        ORDER BY COALESCE(t.data_scadenza, t.data_prossima) ASC
      `);

    return NextResponse.json(result.recordset.map((row: any) => ({
      id: row.id,
      dip_id: row.dip_id,
      tipo: row.tipo,
      descrizione: row.descrizione,
      data_scadenza: row.data_scadenza,
      data_prossima: row.data_prossima,
      stato: row.stato,
      dip_nome: row.dip_nome,
      matricola: row.matricola,
    })));
  } catch (err: any) {
    console.error('[API] GET /api/tecsam/scadenze error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
