import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

// GET /api/straordinari/riepilogo?anno=2026&mese_da=1&mese_a=3&dip_id=123
// Returns weekly overtime summaries from CFXX_HR_BANCA_ORE
// mese_da and mese_a are converted to week ranges (approx)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const anno = searchParams.get('anno');
    const mese_da = searchParams.get('mese_da');
    const mese_a = searchParams.get('mese_a');
    const dip_id = searchParams.get('dip_id');

    if (!anno || !mese_da || !mese_a) {
      return NextResponse.json(
        { error: 'Parametri obbligatori: anno, mese_da, mese_a' },
        { status: 400 }
      );
    }

    // Convert months to approximate ISO week numbers
    // Week 1 of month M ~= (M-1)*4.33 + 1 ; last week of month M ~= M*4.33
    const settimana_da = Math.max(1, Math.floor((Number(mese_da) - 1) * 4.33) + 1);
    const settimana_a = Math.min(53, Math.ceil(Number(mese_a) * 4.33));

    const pool = await getPool();
    const request = pool
      .request()
      .input('anno', sql.Int, Number(anno))
      .input('sett_da', sql.Int, settimana_da)
      .input('sett_a', sql.Int, settimana_a);

    let whereClause = 'b.anno = @anno AND b.settimana BETWEEN @sett_da AND @sett_a';

    if (dip_id) {
      request.input('dip_id', sql.Int, Number(dip_id));
      whereClause += ' AND b.dip_id = @dip_id';
    }

    const result = await request.query(`
      SELECT
        b.*,
        d.nome AS dip_nome,
        d.matricola
      FROM CFXX_HR_BANCA_ORE b
      INNER JOIN CFXX_HR_ANAG_DIP d ON d.id = b.dip_id
      WHERE ${whereClause}
      ORDER BY d.nome, b.settimana
    `);

    return NextResponse.json(result.recordset);
  } catch (err: any) {
    console.error('[API] GET /api/straordinari/riepilogo error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
