import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/regole-globali/:id
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const pool = await getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, Number(id))
      .query('SELECT * FROM CFXX_HR_REGOLE_GLOBALI WHERE id = @id');

    if (result.recordset.length === 0) {
      return NextResponse.json({ error: 'Regola non trovata' }, { status: 404 });
    }

    return NextResponse.json(parseRow(result.recordset[0]));
  } catch (err: any) {
    console.error('[API] GET /api/regole-globali/:id error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT /api/regole-globali/:id
export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const pool = await getPool();

    const result = await pool
      .request()
      .input('id', sql.Int, Number(id))
      .input('nome', sql.NVarChar(100), body.nome)
      .input('ft_eccesso_pipeline', sql.NVarChar(sql.MAX), JSON.stringify(body.ft_eccesso_pipeline ?? []))
      .input('pt_eccesso_pipeline', sql.NVarChar(sql.MAX), JSON.stringify(body.pt_eccesso_pipeline ?? []))
      .input('pt_supplementari_attivo', sql.Bit, body.pt_supplementari_attivo ?? true)
      .input('straordinario_max_sett', sql.Decimal(5, 2), body.straordinario_max_sett ?? 8)
      .input('straordinario_max_giorno', sql.Decimal(5, 2), body.straordinario_max_giorno ?? 2)
      .input('straordinario_priorita_sabato', sql.Bit, body.straordinario_priorita_sabato ?? true)
      .input('deficit_pipeline', sql.NVarChar(sql.MAX), JSON.stringify(body.deficit_pipeline ?? []))
      .input('pausa_minuti_default', sql.Int, body.pausa_minuti_default ?? 30)
      .input('pausa_soglia_ore_default', sql.Decimal(4, 2), body.pausa_soglia_ore_default ?? 8)
      .input('pausa_auto_default', sql.Bit, body.pausa_auto_default ?? true)
      .input('attivo', sql.Bit, body.attivo ?? true)
      .query(`
        UPDATE CFXX_HR_REGOLE_GLOBALI SET
          nome = @nome,
          ft_eccesso_pipeline = @ft_eccesso_pipeline,
          pt_eccesso_pipeline = @pt_eccesso_pipeline,
          pt_supplementari_attivo = @pt_supplementari_attivo,
          straordinario_max_sett = @straordinario_max_sett,
          straordinario_max_giorno = @straordinario_max_giorno,
          straordinario_priorita_sabato = @straordinario_priorita_sabato,
          deficit_pipeline = @deficit_pipeline,
          pausa_minuti_default = @pausa_minuti_default,
          pausa_soglia_ore_default = @pausa_soglia_ore_default,
          pausa_auto_default = @pausa_auto_default,
          attivo = @attivo,
          data_mod = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json({ error: 'Regola non trovata' }, { status: 404 });
    }

    return NextResponse.json(parseRow(result.recordset[0]));
  } catch (err: any) {
    console.error('[API] PUT /api/regole-globali/:id error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/regole-globali/:id
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const pool = await getPool();
    await pool
      .request()
      .input('id', sql.Int, Number(id))
      .query('DELETE FROM CFXX_HR_REGOLE_GLOBALI WHERE id = @id');

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[API] DELETE /api/regole-globali/:id error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseRow(row: any) {
  return {
    id: row.id,
    nome: row.nome,
    ft_eccesso_pipeline: safeParseJSON(row.ft_eccesso_pipeline, []),
    pt_eccesso_pipeline: safeParseJSON(row.pt_eccesso_pipeline, []),
    pt_supplementari_attivo: !!row.pt_supplementari_attivo,
    straordinario_max_sett: Number(row.straordinario_max_sett),
    straordinario_max_giorno: Number(row.straordinario_max_giorno),
    straordinario_priorita_sabato: !!row.straordinario_priorita_sabato,
    deficit_pipeline: safeParseJSON(row.deficit_pipeline, []),
    pausa_minuti_default: row.pausa_minuti_default,
    pausa_soglia_ore_default: Number(row.pausa_soglia_ore_default),
    pausa_auto_default: !!row.pausa_auto_default,
    attivo: !!row.attivo,
    data_ins: row.data_ins,
    data_mod: row.data_mod,
  };
}

function safeParseJSON(val: any, fallback: any) {
  if (!val) return fallback;
  try {
    return typeof val === 'string' ? JSON.parse(val) : val;
  } catch {
    return fallback;
  }
}
