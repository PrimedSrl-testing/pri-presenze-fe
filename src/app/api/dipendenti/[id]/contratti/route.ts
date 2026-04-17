import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/dipendenti/:id/contratti — storico contratti
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const pool = await getPool();
    const result = await pool
      .request()
      .input('dip_id', sql.Int, Number(id))
      .query(`
        SELECT * FROM CFXX_HR_STORICO_CONTRATTI
        WHERE dip_id = @dip_id
        ORDER BY data_inizio DESC
      `);

    const rows = result.recordset.map((r: any) => ({
      id: r.id,
      dip_id: r.dip_id,
      data_inizio: r.data_inizio,
      data_fine: r.data_fine,
      tipo_contratto: r.tipo_contratto,
      ore_settimanali: r.ore_settimanali != null ? Number(r.ore_settimanali) : null,
      tipo_rapporto: r.tipo_rapporto,
      note: r.note,
      attivo: !!r.attivo,
    }));

    // Calcola mesi totali
    let mesi_totali = 0;
    for (const c of rows) {
      const inizio = new Date(c.data_inizio);
      const fine = c.data_fine ? new Date(c.data_fine) : new Date();
      const diffMs = fine.getTime() - inizio.getTime();
      mesi_totali += Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.44)));
    }

    return NextResponse.json({
      contratti: rows,
      mesi_totali,
      oltre_12_mesi: mesi_totali > 12,
      oltre_24_mesi: mesi_totali > 24,
      mesi_residui_24: Math.max(0, 24 - mesi_totali),
    });
  } catch (err: any) {
    console.error('[API] GET /api/dipendenti/:id/contratti error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/dipendenti/:id/contratti — nuovo contratto
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const pool = await getPool();

    if (!body.data_inizio) {
      return NextResponse.json({ error: 'Data inizio obbligatoria' }, { status: 400 });
    }

    const result = await pool
      .request()
      .input('dip_id', sql.Int, Number(id))
      .input('data_inizio', sql.Date, body.data_inizio)
      .input('data_fine', sql.Date, body.data_fine ?? null)
      .input('tipo_contratto', sql.NVarChar(100), body.tipo_contratto ?? null)
      .input('ore_settimanali', sql.Decimal(5, 2), body.ore_settimanali ?? null)
      .input('tipo_rapporto', sql.NVarChar(30), body.tipo_rapporto ?? null)
      .input('note', sql.NVarChar(500), body.note ?? null)
      .input('attivo', sql.Bit, body.attivo ?? true)
      .query(`
        INSERT INTO CFXX_HR_STORICO_CONTRATTI
          (dip_id, data_inizio, data_fine, tipo_contratto, ore_settimanali, tipo_rapporto, note, attivo)
        OUTPUT INSERTED.*
        VALUES
          (@dip_id, @data_inizio, @data_fine, @tipo_contratto, @ore_settimanali, @tipo_rapporto, @note, @attivo)
      `);

    return NextResponse.json(result.recordset[0], { status: 201 });
  } catch (err: any) {
    console.error('[API] POST /api/dipendenti/:id/contratti error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT /api/dipendenti/:id/contratti — aggiorna contratto (body.contratto_id)
export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const body = await req.json();
    const pool = await getPool();

    if (!body.contratto_id) {
      return NextResponse.json({ error: 'contratto_id obbligatorio' }, { status: 400 });
    }

    await pool
      .request()
      .input('id', sql.Int, body.contratto_id)
      .input('data_inizio', sql.Date, body.data_inizio)
      .input('data_fine', sql.Date, body.data_fine ?? null)
      .input('tipo_contratto', sql.NVarChar(100), body.tipo_contratto ?? null)
      .input('ore_settimanali', sql.Decimal(5, 2), body.ore_settimanali ?? null)
      .input('tipo_rapporto', sql.NVarChar(30), body.tipo_rapporto ?? null)
      .input('note', sql.NVarChar(500), body.note ?? null)
      .input('attivo', sql.Bit, body.attivo ?? true)
      .query(`
        UPDATE CFXX_HR_STORICO_CONTRATTI SET
          data_inizio = @data_inizio, data_fine = @data_fine,
          tipo_contratto = @tipo_contratto, ore_settimanali = @ore_settimanali,
          tipo_rapporto = @tipo_rapporto, note = @note, attivo = @attivo,
          data_mod = GETDATE()
        WHERE id = @id
      `);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[API] PUT /api/dipendenti/:id/contratti error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/dipendenti/:id/contratti — elimina contratto (body.contratto_id via query param)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contrattoId = searchParams.get('contratto_id');
    if (!contrattoId) {
      return NextResponse.json({ error: 'contratto_id obbligatorio' }, { status: 400 });
    }

    const pool = await getPool();
    await pool
      .request()
      .input('id', sql.Int, Number(contrattoId))
      .query('DELETE FROM CFXX_HR_STORICO_CONTRATTI WHERE id = @id');

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[API] DELETE /api/dipendenti/:id/contratti error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
