import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

/**
 * GET /api/dipendenti/stats/qualifica
 * Conteggio dipendenti ATTIVI per qualifica (Impiegato / Operaio / Altro).
 * Attivo = cessato=0 AND (data_fine IS NULL OR data_fine >= today)
 */
export async function GET(_req: NextRequest) {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT
        d.id,
        d.nome,
        d.matricola,
        d.qualifica_inps,
        d.qualifica_professionale,
        d.livello_contrattuale,
        d.mansione_desc,
        d.tipo_soggetto,
        d.cessato,
        d.data_fine,
        d.data_cessazione
      FROM CFXX_HR_ANAG_DIP d
      WHERE d.cessato = 0
        AND (d.data_fine IS NULL OR d.data_fine >= CAST(GETDATE() AS DATE))
        AND (d.data_cessazione IS NULL OR d.data_cessazione >= CAST(GETDATE() AS DATE))
    `);

    const rows = result.recordset;

    // Classificazione: si basa su qualifica_inps (preferita), poi qualifica_professionale, poi tipo_soggetto
    const classify = (r: any): "impiegato" | "operaio" | "apprendista" | "dirigente" | "altro" => {
      const fields = [r.qualifica_inps, r.qualifica_professionale, r.livello_contrattuale, r.mansione_desc, r.tipo_soggetto]
        .filter(Boolean).map((s: string) => String(s).toLowerCase());
      const blob = fields.join(' | ');
      if (/impiegat/i.test(blob)) return 'impiegato';
      if (/operai|operaio/i.test(blob)) return 'operaio';
      if (/apprendist/i.test(blob)) return 'apprendista';
      if (/dirigent|quadro/i.test(blob)) return 'dirigente';
      return 'altro';
    };

    const counters: Record<string, number> = { impiegato: 0, operaio: 0, apprendista: 0, dirigente: 0, altro: 0 };
    const altriDettaglio: { id: number; nome: string; matricola: string; qualifica: string | null }[] = [];

    for (const r of rows) {
      const cat = classify(r);
      counters[cat]++;
      if (cat === 'altro') {
        altriDettaglio.push({
          id: r.id, nome: r.nome, matricola: r.matricola,
          qualifica: r.qualifica_inps || r.qualifica_professionale || r.tipo_soggetto || null,
        });
      }
    }

    return NextResponse.json({
      totale_attivi: rows.length,
      counters,
      altri_dettaglio: altriDettaglio.slice(0, 30),
      totale_altri: altriDettaglio.length,
    });
  } catch (err: any) {
    console.error('[API] GET /api/dipendenti/stats/qualifica error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
