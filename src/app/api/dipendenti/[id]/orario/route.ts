import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';
import { getPeriodoAttivo } from '@/lib/contratto-ciclico';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/dipendenti/:id/orario — Assegnazione orario del dipendente.
// Se il dipendente ha un contratto ciclico attivo con template_id sul periodo corrente,
// quello sovrascrive il template assegnato in CFXX_HR_DIP_ORARIO (override dinamico per data odierna).
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const pool = await getPool();

    const result = await pool
      .request()
      .input('dip_id', sql.Int, Number(id))
      .query(`
        SELECT o.*, t.nome AS template_nome, t.num_settimane
        FROM CFXX_HR_DIP_ORARIO o
        LEFT JOIN CFXX_HR_ORARI_TEMPLATE t ON t.id = o.template_id
        WHERE o.dip_id = @dip_id
      `);

    // Carica contratto ciclico attivo (può modificare il template effettivo per data)
    const cicRes = await pool
      .request()
      .input('dip_id', sql.Int, Number(id))
      .query(`SELECT TOP 1 * FROM CFXX_HR_CONTRATTI_CICLICI WHERE dip_id = @dip_id AND attivo = 1 ORDER BY id DESC`);
    const ciclico = cicRes.recordset[0] ?? null;
    const periodoAttivo = ciclico ? getPeriodoAttivo(ciclico as any, new Date()) : null;

    // Base orario dal record DIP_ORARIO (può essere assente)
    const baseRow = result.recordset[0] ?? null;
    const baseTemplateId = baseRow?.template_id ?? null;

    // Template effettivo: priorità al ciclico (se ha template_id per il periodo attivo)
    const effectiveTemplateId = periodoAttivo?.template_id ?? baseTemplateId;

    // Se non c'è né base né ciclico-template, ritorna null (nessuna assegnazione)
    if (!baseRow && !effectiveTemplateId) {
      return NextResponse.json(null);
    }

    // Se serve, recupera nome+num_settimane del template effettivo (se diverso dal base)
    let templateNome = baseRow?.template_nome ?? null;
    let numSettimane = baseRow?.num_settimane ?? null;
    if (effectiveTemplateId && effectiveTemplateId !== baseTemplateId) {
      const tRes = await pool.request().input('id', sql.Int, effectiveTemplateId)
        .query(`SELECT nome, num_settimane FROM CFXX_HR_ORARI_TEMPLATE WHERE id = @id`);
      if (tRes.recordset[0]) {
        templateNome = tRes.recordset[0].nome;
        numSettimane = tRes.recordset[0].num_settimane;
      }
    }

    return NextResponse.json({
      id: baseRow?.id ?? null,
      dip_id: Number(id),
      template_id: effectiveTemplateId,
      base_template_id: baseTemplateId,
      data_inizio_ciclo: baseRow?.data_inizio_ciclo ?? null,
      attivo: baseRow ? !!baseRow.attivo : true,
      note: baseRow?.note ?? null,
      template_nome: templateNome,
      num_settimane: numSettimane,
      // Info sul ciclico se sta sovrascrivendo
      ciclico_override: periodoAttivo && periodoAttivo.template_id ? {
        periodo: periodoAttivo.periodo,
        ore_sett: periodoAttivo.ore_sett,
        is_part_time: periodoAttivo.is_part_time,
        data_inizio: periodoAttivo.data_inizio,
        data_fine: periodoAttivo.data_fine,
      } : null,
    });
  } catch (err: any) {
    console.error('[API] GET /api/dipendenti/:id/orario error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT /api/dipendenti/:id/orario — Upsert assegnazione orario
export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const dipId = Number(id);
    const body = await req.json();

    // Validazione: template_id e data_inizio_ciclo sono NOT NULL nel DB
    const templateId = body.template_id != null ? Number(body.template_id) : null;
    if (!templateId || templateId <= 0) {
      return NextResponse.json({ error: 'template_id obbligatorio (>0)' }, { status: 400 });
    }
    const dataInizioCiclo = (typeof body.data_inizio_ciclo === 'string' && body.data_inizio_ciclo.trim())
      ? body.data_inizio_ciclo.trim()
      : null;
    if (!dataInizioCiclo) {
      return NextResponse.json({ error: 'data_inizio_ciclo obbligatoria (formato YYYY-MM-DD)' }, { status: 400 });
    }

    const pool = await getPool();

    // Upsert via MERGE
    await pool
      .request()
      .input('dip_id', sql.Int, dipId)
      .input('template_id', sql.Int, templateId)
      .input('data_inizio_ciclo', sql.Date, dataInizioCiclo)
      .input('attivo', sql.Bit, body.attivo ?? true)
      .input('note', sql.NVarChar(500), body.note ?? null)
      .query(`
        MERGE CFXX_HR_DIP_ORARIO AS target
        USING (SELECT @dip_id AS dip_id) AS source
        ON target.dip_id = source.dip_id
        WHEN MATCHED THEN
          UPDATE SET
            template_id = @template_id,
            data_inizio_ciclo = @data_inizio_ciclo,
            attivo = @attivo,
            note = @note,
            data_mod = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (dip_id, template_id, data_inizio_ciclo, attivo, note)
          VALUES (@dip_id, @template_id, @data_inizio_ciclo, @attivo, @note);
      `);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[API] PUT /api/dipendenti/:id/orario error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
