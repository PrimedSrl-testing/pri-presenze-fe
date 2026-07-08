import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

// GET /api/contratti-ciclici — list all active
export async function GET() {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT cc.*, d.nome AS dip_nome, d.matricola
      FROM CFXX_HR_CONTRATTI_CICLICI cc
      INNER JOIN CFXX_HR_ANAG_DIP d ON d.id = cc.dip_id
      WHERE cc.attivo = 1
      ORDER BY d.nome
    `);

    return NextResponse.json(result.recordset);
  } catch (err: any) {
    console.error('[API] GET /api/contratti-ciclici error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/contratti-ciclici — create new
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pool = await getPool();

    const result = await pool
      .request()
      .input('dip_id', sql.Int, body.dip_id)
      .input('periodo1_da_mese', sql.Int, body.periodo1_da_mese)
      .input('periodo1_da_giorno', sql.Int, body.periodo1_da_giorno)
      .input('periodo1_ore_sett', sql.Decimal(5, 2), body.periodo1_ore_sett)
      .input('periodo1_contratto_id', sql.Int, body.periodo1_contratto_id ?? null)
      .input('periodo1_template_id', sql.Int, body.periodo1_template_id ?? null)
      .input('periodo2_da_mese', sql.Int, body.periodo2_da_mese)
      .input('periodo2_da_giorno', sql.Int, body.periodo2_da_giorno)
      .input('periodo2_ore_sett', sql.Decimal(5, 2), body.periodo2_ore_sett)
      .input('periodo2_contratto_id', sql.Int, body.periodo2_contratto_id ?? null)
      .input('periodo2_template_id', sql.Int, body.periodo2_template_id ?? null)
      .input('override_data_switch1', sql.Date, body.override_data_switch1 ?? null)
      .input('override_data_switch2', sql.Date, body.override_data_switch2 ?? null)
      .input('anno_riferimento', sql.Int, body.anno_riferimento ?? null)
      .input('attivo', sql.Bit, body.attivo !== false ? 1 : 0)
      .input('note', sql.NVarChar(500), body.note ?? null)
      .query(`
        INSERT INTO CFXX_HR_CONTRATTI_CICLICI
          (dip_id, periodo1_da_mese, periodo1_da_giorno, periodo1_ore_sett, periodo1_contratto_id, periodo1_template_id,
           periodo2_da_mese, periodo2_da_giorno, periodo2_ore_sett, periodo2_contratto_id, periodo2_template_id,
           override_data_switch1, override_data_switch2, anno_riferimento, attivo, note, data_ins)
        OUTPUT INSERTED.*
        VALUES
          (@dip_id, @periodo1_da_mese, @periodo1_da_giorno, @periodo1_ore_sett, @periodo1_contratto_id, @periodo1_template_id,
           @periodo2_da_mese, @periodo2_da_giorno, @periodo2_ore_sett, @periodo2_contratto_id, @periodo2_template_id,
           @override_data_switch1, @override_data_switch2, @anno_riferimento, @attivo, @note, GETDATE())
      `);

    return NextResponse.json(result.recordset[0], { status: 201 });
  } catch (err: any) {
    console.error('[API] POST /api/contratti-ciclici error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
