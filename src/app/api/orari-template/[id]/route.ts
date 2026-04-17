import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/orari-template/:id — Singolo template con giorni
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const pool = await getPool();

    const tRes = await pool
      .request()
      .input('id', sql.Int, Number(id))
      .query('SELECT * FROM CFXX_HR_ORARI_TEMPLATE WHERE id = @id');

    if (tRes.recordset.length === 0) {
      return NextResponse.json({ error: 'Template non trovato' }, { status: 404 });
    }

    const dRes = await pool
      .request()
      .input('template_id', sql.Int, Number(id))
      .query(
        `SELECT * FROM CFXX_HR_ORARI_TEMPLATE_GIORNI
         WHERE template_id = @template_id
         ORDER BY settimana_num, giorno_settimana`
      );

    const t = tRes.recordset[0];
    return NextResponse.json({
      id: t.id,
      nome: t.nome,
      num_settimane: t.num_settimane,
      attivo: !!t.attivo,
      note: t.note,
      giorni: dRes.recordset.map((d: any) => ({
        id: d.id,
        template_id: d.template_id,
        settimana_num: d.settimana_num,
        giorno_settimana: d.giorno_settimana,
        ore_teoriche: Number(d.ore_teoriche),
        orario_inizio: d.orario_inizio,
        orario_fine: d.orario_fine,
      })),
    });
  } catch (err: any) {
    console.error('[API] GET /api/orari-template/:id error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT /api/orari-template/:id — Aggiorna template e giorni
export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const templateId = Number(id);
    const body = await req.json();
    const pool = await getPool();
    const tx = pool.transaction();
    await tx.begin();

    try {
      // Update template
      await tx
        .request()
        .input('id', sql.Int, templateId)
        .input('nome', sql.NVarChar(100), body.nome)
        .input('num_settimane', sql.Int, body.num_settimane)
        .input('attivo', sql.Bit, body.attivo ?? true)
        .input('note', sql.NVarChar(500), body.note ?? null)
        .query(`
          UPDATE CFXX_HR_ORARI_TEMPLATE SET
            nome = @nome, num_settimane = @num_settimane,
            attivo = @attivo, note = @note, data_mod = GETDATE()
          WHERE id = @id
        `);

      // Replace days: delete all + re-insert
      await tx
        .request()
        .input('template_id', sql.Int, templateId)
        .query('DELETE FROM CFXX_HR_ORARI_TEMPLATE_GIORNI WHERE template_id = @template_id');

      if (Array.isArray(body.giorni)) {
        for (const g of body.giorni) {
          await tx
            .request()
            .input('template_id', sql.Int, templateId)
            .input('settimana_num', sql.Int, g.settimana_num)
            .input('giorno_settimana', sql.Int, g.giorno_settimana)
            .input('ore_teoriche', sql.Decimal(5, 2), g.ore_teoriche ?? 0)
            .input('orario_inizio', sql.Time, g.orario_inizio ?? null)
            .input('orario_fine', sql.Time, g.orario_fine ?? null)
            .query(`
              INSERT INTO CFXX_HR_ORARI_TEMPLATE_GIORNI
                (template_id, settimana_num, giorno_settimana, ore_teoriche, orario_inizio, orario_fine)
              VALUES
                (@template_id, @settimana_num, @giorno_settimana, @ore_teoriche, @orario_inizio, @orario_fine)
            `);
        }
      }

      await tx.commit();
      return NextResponse.json({ ok: true });
    } catch (txErr) {
      await tx.rollback();
      throw txErr;
    }
  } catch (err: any) {
    console.error('[API] PUT /api/orari-template/:id error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/orari-template/:id
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const templateId = Number(id);
    const pool = await getPool();
    const tx = pool.transaction();
    await tx.begin();

    try {
      await tx
        .request()
        .input('template_id', sql.Int, templateId)
        .query('DELETE FROM CFXX_HR_ORARI_TEMPLATE_GIORNI WHERE template_id = @template_id');

      await tx
        .request()
        .input('id', sql.Int, templateId)
        .query('DELETE FROM CFXX_HR_ORARI_TEMPLATE WHERE id = @id');

      await tx.commit();
      return NextResponse.json({ ok: true });
    } catch (txErr) {
      await tx.rollback();
      throw txErr;
    }
  } catch (err: any) {
    console.error('[API] DELETE /api/orari-template/:id error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
