import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

// PUT /api/profili-parametri/:id
export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const pool = await getPool();

    await pool
      .request()
      .input('id', sql.Int, Number(id))
      .input('nome', sql.NVarChar(100), body.nome)
      .input('filtro_tipo_contratto', sql.NVarChar(100), body.filtro_tipo_contratto ?? null)
      .input('filtro_tipo_rapporto', sql.NVarChar(30), body.filtro_tipo_rapporto ?? null)
      .input('filtro_ore_da', sql.Decimal(5, 2), body.filtro_ore_da ?? null)
      .input('filtro_ore_a', sql.Decimal(5, 2), body.filtro_ore_a ?? null)
      .input('regole_pausa', sql.NVarChar(sql.MAX), body.regole_pausa ? JSON.stringify(body.regole_pausa) : null)
      .input('pausa_minuti', sql.Int, body.pausa_minuti ?? 30)
      .input('pausa_soglia_ore', sql.Decimal(4, 2), body.pausa_soglia_ore ?? 8)
      .input('pausa_auto', sql.Bit, body.pausa_auto ?? true)
      .input('eccesso_pipeline', sql.NVarChar(sql.MAX), JSON.stringify(body.eccesso_pipeline ?? []))
      .input('deficit_pipeline', sql.NVarChar(sql.MAX), JSON.stringify(body.deficit_pipeline ?? []))
      .input('straordinario_max_sett', sql.Decimal(5, 2), body.straordinario_max_sett ?? 8)
      .input('straordinario_max_giorno', sql.Decimal(5, 2), body.straordinario_max_giorno ?? 2)
      .input('straordinario_priorita_sabato', sql.Bit, body.straordinario_priorita_sabato ?? true)
      .input('priorita', sql.Int, body.priorita ?? 0)
      .input('attivo', sql.Bit, body.attivo ?? true)
      .input('note', sql.NVarChar(500), body.note ?? null)
      .query(`
        UPDATE CFXX_HR_PROFILI_PARAMETRI SET
          nome=@nome, filtro_tipo_contratto=@filtro_tipo_contratto,
          filtro_tipo_rapporto=@filtro_tipo_rapporto,
          filtro_ore_da=@filtro_ore_da, filtro_ore_a=@filtro_ore_a,
          regole_pausa=@regole_pausa, pausa_minuti=@pausa_minuti,
          pausa_soglia_ore=@pausa_soglia_ore, pausa_auto=@pausa_auto,
          eccesso_pipeline=@eccesso_pipeline, deficit_pipeline=@deficit_pipeline,
          straordinario_max_sett=@straordinario_max_sett,
          straordinario_max_giorno=@straordinario_max_giorno,
          straordinario_priorita_sabato=@straordinario_priorita_sabato,
          priorita=@priorita, attivo=@attivo, note=@note, data_mod=GETDATE()
        WHERE id=@id
      `);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/profili-parametri/:id
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const pool = await getPool();
    await pool.request().input('id', sql.Int, Number(id))
      .query('DELETE FROM CFXX_HR_PROFILI_PARAMETRI WHERE id=@id');
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
