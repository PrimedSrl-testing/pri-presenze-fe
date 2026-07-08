import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';
import { mergeRegole } from '@/lib/calcolo-ore';
import type { RegoleGlobali, DipRegole } from '@/types';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/dipendenti/:id/regole — Restituisce regole effettive (merged)
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const dipId = Number(id);
    const pool = await getPool();

    // Fetch regole globali attive
    const globaliRes = await pool.request().query(
      `SELECT TOP 1 * FROM CFXX_HR_REGOLE_GLOBALI WHERE attivo = 1 ORDER BY id`
    );

    // Fetch override dipendente
    const overrideRes = await pool
      .request()
      .input('dip_id', sql.Int, dipId)
      .query('SELECT * FROM CFXX_HR_DIP_REGOLE WHERE dip_id = @dip_id');

    const globali: RegoleGlobali | null = globaliRes.recordset.length > 0
      ? parseGlobali(globaliRes.recordset[0])
      : null;

    const override: DipRegole | null = overrideRes.recordset.length > 0
      ? parseOverride(overrideRes.recordset[0])
      : null;

    // Se non ci sono regole globali, fall-back sull'override del dipendente (se presente)
    // così la UI può comunque popolare/salvare i parametri.
    if (!globali) {
      const effettiveFallback = override ? {
        ft_eccesso_pipeline: override.ft_eccesso_pipeline ?? [],
        pt_eccesso_pipeline: override.pt_eccesso_pipeline ?? [],
        pt_supplementari_attivo: override.pt_supplementari_attivo ?? true,
        straordinario_max_sett: override.straordinario_max_sett ?? 8,
        straordinario_max_giorno: override.straordinario_max_giorno ?? 2,
        straordinario_priorita_sabato: override.straordinario_priorita_sabato ?? true,
        deficit_pipeline: override.deficit_pipeline ?? [],
      } : null;
      return NextResponse.json({
        globali: null,
        override,
        effettive: effettiveFallback,
        has_override: override !== null,
      });
    }

    const effettive = mergeRegole(globali, override);

    return NextResponse.json({
      globali,
      override,
      effettive,
      has_override: override !== null,
    });
  } catch (err: any) {
    console.error('[API] GET /api/dipendenti/:id/regole error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT /api/dipendenti/:id/regole — Upsert override per dipendente
export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const dipId = Number(id);
    const body = await req.json();
    const pool = await getPool();

    // Check if override exists
    const existing = await pool
      .request()
      .input('dip_id', sql.Int, dipId)
      .query('SELECT id FROM CFXX_HR_DIP_REGOLE WHERE dip_id = @dip_id');

    const ftPipeline = body.ft_eccesso_pipeline != null ? JSON.stringify(body.ft_eccesso_pipeline) : null;
    const ptPipeline = body.pt_eccesso_pipeline != null ? JSON.stringify(body.pt_eccesso_pipeline) : null;
    const deficitPipeline = body.deficit_pipeline != null ? JSON.stringify(body.deficit_pipeline) : null;

    if (existing.recordset.length > 0) {
      // Update
      await pool
        .request()
        .input('dip_id', sql.Int, dipId)
        .input('ft_eccesso_pipeline', sql.NVarChar(sql.MAX), ftPipeline)
        .input('pt_eccesso_pipeline', sql.NVarChar(sql.MAX), ptPipeline)
        .input('pt_supplementari_attivo', sql.Bit, body.pt_supplementari_attivo)
        .input('straordinario_max_sett', sql.Decimal(5, 2), body.straordinario_max_sett)
        .input('straordinario_max_giorno', sql.Decimal(5, 2), body.straordinario_max_giorno)
        .input('straordinario_priorita_sabato', sql.Bit, body.straordinario_priorita_sabato)
        .input('deficit_pipeline', sql.NVarChar(sql.MAX), deficitPipeline)
        .input('note', sql.NVarChar(500), body.note ?? null)
        .query(`
          UPDATE CFXX_HR_DIP_REGOLE SET
            ft_eccesso_pipeline = @ft_eccesso_pipeline,
            pt_eccesso_pipeline = @pt_eccesso_pipeline,
            pt_supplementari_attivo = @pt_supplementari_attivo,
            straordinario_max_sett = @straordinario_max_sett,
            straordinario_max_giorno = @straordinario_max_giorno,
            straordinario_priorita_sabato = @straordinario_priorita_sabato,
            deficit_pipeline = @deficit_pipeline,
            note = @note,
            data_mod = GETDATE()
          WHERE dip_id = @dip_id
        `);
    } else {
      // Insert
      await pool
        .request()
        .input('dip_id', sql.Int, dipId)
        .input('ft_eccesso_pipeline', sql.NVarChar(sql.MAX), ftPipeline)
        .input('pt_eccesso_pipeline', sql.NVarChar(sql.MAX), ptPipeline)
        .input('pt_supplementari_attivo', sql.Bit, body.pt_supplementari_attivo)
        .input('straordinario_max_sett', sql.Decimal(5, 2), body.straordinario_max_sett)
        .input('straordinario_max_giorno', sql.Decimal(5, 2), body.straordinario_max_giorno)
        .input('straordinario_priorita_sabato', sql.Bit, body.straordinario_priorita_sabato)
        .input('deficit_pipeline', sql.NVarChar(sql.MAX), deficitPipeline)
        .input('note', sql.NVarChar(500), body.note ?? null)
        .query(`
          INSERT INTO CFXX_HR_DIP_REGOLE (
            dip_id, ft_eccesso_pipeline, pt_eccesso_pipeline, pt_supplementari_attivo,
            straordinario_max_sett, straordinario_max_giorno, straordinario_priorita_sabato,
            deficit_pipeline, note
          ) VALUES (
            @dip_id, @ft_eccesso_pipeline, @pt_eccesso_pipeline, @pt_supplementari_attivo,
            @straordinario_max_sett, @straordinario_max_giorno, @straordinario_priorita_sabato,
            @deficit_pipeline, @note
          )
        `);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[API] PUT /api/dipendenti/:id/regole error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/dipendenti/:id/regole — Rimuovi override (torna a globale)
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const pool = await getPool();
    await pool
      .request()
      .input('dip_id', sql.Int, Number(id))
      .query('DELETE FROM CFXX_HR_DIP_REGOLE WHERE dip_id = @dip_id');

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[API] DELETE /api/dipendenti/:id/regole error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseGlobali(row: any): RegoleGlobali {
  return {
    id: row.id,
    nome: row.nome,
    ft_eccesso_pipeline: safeJSON(row.ft_eccesso_pipeline, []),
    pt_eccesso_pipeline: safeJSON(row.pt_eccesso_pipeline, []),
    pt_supplementari_attivo: !!row.pt_supplementari_attivo,
    straordinario_max_sett: Number(row.straordinario_max_sett),
    straordinario_max_giorno: Number(row.straordinario_max_giorno),
    straordinario_priorita_sabato: !!row.straordinario_priorita_sabato,
    deficit_pipeline: safeJSON(row.deficit_pipeline, []),
    pausa_minuti_default: row.pausa_minuti_default,
    pausa_soglia_ore_default: Number(row.pausa_soglia_ore_default),
    pausa_auto_default: !!row.pausa_auto_default,
    attivo: !!row.attivo,
  };
}

function parseOverride(row: any): DipRegole {
  return {
    id: row.id,
    dip_id: row.dip_id,
    ft_eccesso_pipeline: row.ft_eccesso_pipeline ? safeJSON(row.ft_eccesso_pipeline, null) : null,
    pt_eccesso_pipeline: row.pt_eccesso_pipeline ? safeJSON(row.pt_eccesso_pipeline, null) : null,
    pt_supplementari_attivo: row.pt_supplementari_attivo != null ? !!row.pt_supplementari_attivo : null,
    straordinario_max_sett: row.straordinario_max_sett != null ? Number(row.straordinario_max_sett) : null,
    straordinario_max_giorno: row.straordinario_max_giorno != null ? Number(row.straordinario_max_giorno) : null,
    straordinario_priorita_sabato: row.straordinario_priorita_sabato != null ? !!row.straordinario_priorita_sabato : null,
    deficit_pipeline: row.deficit_pipeline ? safeJSON(row.deficit_pipeline, null) : null,
    note: row.note,
  };
}

function safeJSON(val: any, fallback: any) {
  if (!val) return fallback;
  try { return typeof val === 'string' ? JSON.parse(val) : val; }
  catch { return fallback; }
}
