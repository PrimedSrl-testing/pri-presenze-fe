import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

// GET /api/contratti-ciclici/:id
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pool = await getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, Number(id))
      .query(`
        SELECT cc.*, d.nome AS dip_nome, d.matricola
        FROM CFXX_HR_CONTRATTI_CICLICI cc
        INNER JOIN CFXX_HR_ANAG_DIP d ON d.id = cc.dip_id
        WHERE cc.id = @id
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json({ error: 'Contratto ciclico non trovato' }, { status: 404 });
    }

    return NextResponse.json(result.recordset[0]);
  } catch (err: any) {
    console.error('[API] GET /api/contratti-ciclici/[id] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT /api/contratti-ciclici/:id
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const pool = await getPool();

    await pool
      .request()
      .input('id', sql.Int, Number(id))
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
      .input('attivo', sql.Bit, body.attivo ? 1 : 0)
      .input('note', sql.NVarChar(500), body.note ?? null)
      .query(`
        UPDATE CFXX_HR_CONTRATTI_CICLICI SET
          dip_id = @dip_id,
          periodo1_da_mese = @periodo1_da_mese,
          periodo1_da_giorno = @periodo1_da_giorno,
          periodo1_ore_sett = @periodo1_ore_sett,
          periodo1_contratto_id = @periodo1_contratto_id,
          periodo1_template_id = @periodo1_template_id,
          periodo2_da_mese = @periodo2_da_mese,
          periodo2_da_giorno = @periodo2_da_giorno,
          periodo2_ore_sett = @periodo2_ore_sett,
          periodo2_contratto_id = @periodo2_contratto_id,
          periodo2_template_id = @periodo2_template_id,
          override_data_switch1 = @override_data_switch1,
          override_data_switch2 = @override_data_switch2,
          anno_riferimento = @anno_riferimento,
          attivo = @attivo,
          note = @note,
          data_mod = GETDATE()
        WHERE id = @id
      `);

    // Return updated record
    const updated = await pool
      .request()
      .input('id', sql.Int, Number(id))
      .query('SELECT * FROM CFXX_HR_CONTRATTI_CICLICI WHERE id = @id');

    return NextResponse.json(updated.recordset[0]);
  } catch (err: any) {
    console.error('[API] PUT /api/contratti-ciclici/[id] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/contratti-ciclici/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pool = await getPool();

    const result = await pool
      .request()
      .input('id', sql.Int, Number(id))
      .query('DELETE FROM CFXX_HR_CONTRATTI_CICLICI WHERE id = @id');

    if (result.rowsAffected[0] === 0) {
      return NextResponse.json({ error: 'Contratto ciclico non trovato' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[API] DELETE /api/contratti-ciclici/[id] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
