import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

// GET /api/orari-template — Lista tutti i template
export async function GET() {
  try {
    const pool = await getPool();

    // Fetch templates
    const tRes = await pool.request().query(
      `SELECT * FROM CFXX_HR_ORARI_TEMPLATE ORDER BY nome`
    );

    // Fetch all days
    const dRes = await pool.request().query(
      `SELECT * FROM CFXX_HR_ORARI_TEMPLATE_GIORNI ORDER BY template_id, settimana_num, giorno_settimana`
    );

    const templates = tRes.recordset.map((t: any) => ({
      id: t.id,
      nome: t.nome,
      num_settimane: t.num_settimane,
      attivo: !!t.attivo,
      note: t.note,
      giorni: dRes.recordset
        .filter((d: any) => d.template_id === t.id)
        .map((d: any) => ({
          id: d.id,
          template_id: d.template_id,
          settimana_num: d.settimana_num,
          giorno_settimana: d.giorno_settimana,
          ore_teoriche: Number(d.ore_teoriche),
          orario_inizio: d.orario_inizio,
          orario_fine: d.orario_fine,
        })),
    }));

    return NextResponse.json(templates);
  } catch (err: any) {
    console.error('[API] GET /api/orari-template error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/orari-template — Crea template con giorni (transazione)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nome, num_settimane, attivo, note, giorni } = body;

    if (!nome || !num_settimane) {
      return NextResponse.json(
        { error: 'nome e num_settimane sono obbligatori' },
        { status: 400 }
      );
    }

    const pool = await getPool();
    const tx = pool.transaction();
    await tx.begin();

    try {
      // Insert template
      const tRes = await tx
        .request()
        .input('nome', sql.NVarChar(100), nome)
        .input('num_settimane', sql.Int, num_settimane)
        .input('attivo', sql.Bit, attivo ?? true)
        .input('note', sql.NVarChar(500), note ?? null)
        .query(`
          INSERT INTO CFXX_HR_ORARI_TEMPLATE (nome, num_settimane, attivo, note)
          OUTPUT INSERTED.id
          VALUES (@nome, @num_settimane, @attivo, @note)
        `);

      const templateId = tRes.recordset[0].id;

      // Insert days
      if (Array.isArray(giorni)) {
        for (const g of giorni) {
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
      return NextResponse.json({ id: templateId }, { status: 201 });
    } catch (txErr) {
      await tx.rollback();
      throw txErr;
    }
  } catch (err: any) {
    console.error('[API] POST /api/orari-template error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
