import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';
import {
  calcolaOre,
  calcolaOreLegacy,
  mergeRegole,
} from '@/lib/calcolo-ore';
import type { RegoleGlobali, DipRegole, RegoleEffettive } from '@/types';

// POST /api/straordinari/calcolo
// Body: { dip_id, anno, settimana, ore_lavorate, ore_per_giorno? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { dip_id, anno, settimana, ore_lavorate, ore_per_giorno } = body;

    if (!dip_id || !anno || !settimana || ore_lavorate == null) {
      return NextResponse.json(
        { error: 'Campi obbligatori: dip_id, anno, settimana, ore_lavorate' },
        { status: 400 }
      );
    }

    const pool = await getPool();

    // ── 1. Get ore_settimanali ──────────────────────────────────────────────
    const dipResult = await pool
      .request()
      .input('dip_id', sql.Int, dip_id)
      .query('SELECT ore_settimanali FROM CFXX_HR_ANAG_DIP WHERE id = @dip_id');

    if (dipResult.recordset.length === 0) {
      return NextResponse.json({ error: 'Dipendente non trovato' }, { status: 404 });
    }

    const ore_contrattuali: number = dipResult.recordset[0].ore_settimanali;
    const oreLav: number = Number(ore_lavorate);

    // ── 2. Try to get regole (globali + override) ───────────────────────────
    let regoleEffettive: RegoleEffettive | null = null;

    const [globaliRes, overrideRes] = await Promise.all([
      pool.request().query(
        `SELECT TOP 1 * FROM CFXX_HR_REGOLE_GLOBALI WHERE attivo = 1 ORDER BY id`
      ),
      pool.request()
        .input('dip_id', sql.Int, dip_id)
        .query('SELECT * FROM CFXX_HR_DIP_REGOLE WHERE dip_id = @dip_id'),
    ]);

    if (globaliRes.recordset.length > 0) {
      const globali = parseGlobali(globaliRes.recordset[0]);
      const override = overrideRes.recordset.length > 0
        ? parseOverride(overrideRes.recordset[0])
        : null;
      regoleEffettive = mergeRegole(globali, override);
    }

    // ── 3. Calcola ──────────────────────────────────────────────────────────
    let result;

    if (regoleEffettive) {
      // Nuovo sistema: pipeline configurabile
      result = calcolaOre({
        ore_contrattuali,
        ore_lavorate: oreLav,
        ore_per_giorno: ore_per_giorno ?? undefined,
        regole: regoleEffettive,
      });
    } else {
      // Fallback: calcolo legacy con flag BOS
      const cfgResult = await pool
        .request()
        .input('dip_id', sql.Int, dip_id)
        .query('SELECT flg_bos FROM CFXX_HR_DIP_CONFIG WHERE dip_id = @dip_id');

      const flgBos = cfgResult.recordset.length > 0
        ? !!cfgResult.recordset[0].flg_bos
        : false;

      result = calcolaOreLegacy(ore_contrattuali, oreLav, flgBos);
    }

    // ── 4. Upsert CFXX_HR_BANCA_ORE ────────────────────────────────────────
    const upsertResult = await pool
      .request()
      .input('dip_id', sql.Int, dip_id)
      .input('anno', sql.Int, anno)
      .input('settimana', sql.Int, settimana)
      .input('ore_contrattuali', sql.Decimal(6, 2), ore_contrattuali)
      .input('ore_lavorate', sql.Decimal(6, 2), oreLav)
      .input('ore_supplementari', sql.Decimal(6, 2), result.ore_supplementari)
      .input('ore_straordinario_pagabile', sql.Decimal(6, 2), result.ore_straordinario_pagabile)
      .input('ore_bob', sql.Decimal(6, 2), result.ore_bob)
      .input('ore_boa', sql.Decimal(6, 2), result.ore_boa)
      .input('ore_bop', sql.Decimal(6, 2), result.ore_bop)
      .input('ore_bos', sql.Decimal(6, 2), result.ore_bos)
      .query(`
        MERGE CFXX_HR_BANCA_ORE AS target
        USING (SELECT @dip_id AS dip_id, @anno AS anno, @settimana AS settimana) AS source
        ON target.dip_id = source.dip_id
           AND target.anno = source.anno
           AND target.settimana = source.settimana
        WHEN MATCHED THEN
          UPDATE SET
            ore_contrattuali = @ore_contrattuali,
            ore_lavorate = @ore_lavorate,
            ore_supplementari = @ore_supplementari,
            ore_straordinario_pagabile = @ore_straordinario_pagabile,
            ore_bob = @ore_bob,
            ore_boa = @ore_boa,
            ore_bop = @ore_bop,
            ore_bos = @ore_bos,
            calcolato_il = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (dip_id, anno, settimana, ore_contrattuali, ore_lavorate,
                  ore_supplementari, ore_straordinario_pagabile, ore_bob,
                  ore_boa, ore_bop, ore_bos, calcolato_il)
          VALUES (@dip_id, @anno, @settimana, @ore_contrattuali, @ore_lavorate,
                  @ore_supplementari, @ore_straordinario_pagabile, @ore_bob,
                  @ore_boa, @ore_bop, @ore_bos, GETDATE())
        OUTPUT INSERTED.*;
      `);

    const row = upsertResult.recordset[0];
    return NextResponse.json({
      id: row.id,
      dip_id: row.dip_id,
      anno: row.anno,
      settimana: row.settimana,
      ore_contrattuali: row.ore_contrattuali,
      ore_lavorate: row.ore_lavorate,
      ore_supplementari: row.ore_supplementari,
      ore_straordinario_pagabile: row.ore_straordinario_pagabile,
      ore_bob: row.ore_bob,
      ore_boa: row.ore_boa,
      ore_bop: row.ore_bop,
      ore_bos: row.ore_bos,
      calcolato_il: row.calcolato_il,
      note: row.note,
      usa_pipeline: !!regoleEffettive,
    });
  } catch (err: any) {
    console.error('[API] POST /api/straordinari/calcolo error:', err);
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
