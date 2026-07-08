import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';
import { getPeriodoAttivo } from '@/lib/contratto-ciclico';

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/dipendenti/:id/presenze/auto-genera?anno=YYYY&mese=MM
 *
 * Genera automaticamente le presenze del mese per un dipendente NON-timbrante,
 * basandosi sul template orario assegnato (considera anche contratto ciclico).
 *
 * Comportamento:
 * - Salta i giorni che hanno già una presenza (qualsiasi stato), per non sovrascrivere assenze/ferie manuali
 * - Per i giorni lavorativi del template con ore_teoriche > 0: crea presenza con stato='lavorata_auto'
 * - I giorni con ore_teoriche = 0 (riposo) vengono ignorati
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const dipId = Number(id);
    const { searchParams } = new URL(req.url);
    const anno = Number(searchParams.get('anno'));
    const mese = Number(searchParams.get('mese'));

    if (!anno || !mese || mese < 1 || mese > 12) {
      return NextResponse.json({ error: 'Parametri anno e mese obbligatori (mese 1-12)' }, { status: 400 });
    }

    const pool = await getPool();

    // 1. Verifica flag non_timbrante
    const cfgRes = await pool.request().input('dip_id', sql.Int, dipId)
      .query(`SELECT flg_non_timbrante FROM CFXX_HR_DIP_CONFIG WHERE dip_id = @dip_id`);
    if (cfgRes.recordset.length === 0 || !cfgRes.recordset[0].flg_non_timbrante) {
      return NextResponse.json({
        error: 'Il dipendente non ha il flag "Non Timbrante" attivo. Abilitalo da Parametri Fine Mese prima di generare presenze automatiche.',
      }, { status: 400 });
    }

    // 2. Carica DIP_ORARIO (template + data inizio ciclo)
    const dipOrarioRes = await pool.request().input('dip_id', sql.Int, dipId)
      .query(`SELECT * FROM CFXX_HR_DIP_ORARIO WHERE dip_id = @dip_id`);
    const baseDipOrario = dipOrarioRes.recordset[0] ?? null;

    // 3. Carica contratto ciclico (può sovrascrivere il template per data)
    const cicRes = await pool.request().input('dip_id', sql.Int, dipId)
      .query(`SELECT TOP 1 * FROM CFXX_HR_CONTRATTI_CICLICI WHERE dip_id = @dip_id AND attivo = 1 ORDER BY id DESC`);
    const ciclico = cicRes.recordset[0] ?? null;

    // 4. Costruisci la mappa "data → template_id effettivo" per il mese
    const giorniNelMese = new Date(anno, mese, 0).getDate();
    const dateDelMese: Date[] = [];
    for (let d = 1; d <= giorniNelMese; d++) {
      dateDelMese.push(new Date(anno, mese - 1, d));
    }

    // 5. Per ogni data, trova il template effettivo
    const templatesCache = new Map<number, any>();
    const loadTemplate = async (tplId: number) => {
      if (templatesCache.has(tplId)) return templatesCache.get(tplId);
      const tRes = await pool.request().input('id', sql.Int, tplId)
        .query(`SELECT t.id, t.num_settimane FROM CFXX_HR_ORARI_TEMPLATE t WHERE t.id = @id`);
      if (!tRes.recordset[0]) return null;
      const gRes = await pool.request().input('tid', sql.Int, tplId)
        .query(`SELECT settimana_num, giorno_settimana, ore_teoriche, orario_inizio, orario_fine
                FROM CFXX_HR_ORARI_TEMPLATE_GIORNI WHERE template_id = @tid`);
      const tpl = { ...tRes.recordset[0], giorni: gRes.recordset };
      templatesCache.set(tplId, tpl);
      return tpl;
    };

    // 6. Presenze già esistenti nel mese (per skip)
    const prRes = await pool.request()
      .input('dip_id', sql.Int, dipId)
      .input('anno', sql.Int, anno)
      .input('mese', sql.Int, mese)
      .query(`
        SELECT data FROM CFXX_HR_PRESENZE
        WHERE dip_id = @dip_id AND YEAR(data) = @anno AND MONTH(data) = @mese
      `);
    const dateEsistenti = new Set(prRes.recordset.map((r: any) => new Date(r.data).toISOString().split('T')[0]));

    let generate = 0;
    let saltati = 0;
    const errori: string[] = [];

    for (const d of dateDelMese) {
      const isoDate = d.toISOString().split('T')[0];
      if (dateEsistenti.has(isoDate)) { saltati++; continue; }

      // Determina template_id effettivo per questa data
      const periodoAttivo = ciclico ? getPeriodoAttivo(ciclico as any, d) : null;
      const tplId = periodoAttivo?.template_id ?? baseDipOrario?.template_id ?? null;
      if (!tplId) {
        errori.push(`${isoDate}: nessun template assegnato`);
        saltati++;
        continue;
      }

      const tpl = await loadTemplate(tplId);
      if (!tpl) { errori.push(`${isoDate}: template ${tplId} non trovato`); saltati++; continue; }

      // Calcola settimana_num (rotazione settimanale: serve data_inizio_ciclo per ancorare)
      const dataInizioCiclo = baseDipOrario?.data_inizio_ciclo ? new Date(baseDipOrario.data_inizio_ciclo) : new Date(anno, 0, 1);
      // Allinea al lunedì
      const lunBase = new Date(dataInizioCiclo); lunBase.setDate(lunBase.getDate() - ((lunBase.getDay() + 6) % 7));
      const lunD = new Date(d); lunD.setDate(lunD.getDate() - ((lunD.getDay() + 6) % 7));
      const settDiff = Math.floor((lunD.getTime() - lunBase.getTime()) / (7 * 24 * 60 * 60 * 1000));
      const settimanaNum = ((settDiff % tpl.num_settimane) + tpl.num_settimane) % tpl.num_settimane + 1;

      // giorno_settimana: 1=Lun..7=Dom (ISO)
      const giornoSett = ((d.getDay() + 6) % 7) + 1;

      // Trova il giorno nel template
      const giornoTpl = tpl.giorni.find((g: any) => g.settimana_num === settimanaNum && g.giorno_settimana === giornoSett);
      if (!giornoTpl || Number(giornoTpl.ore_teoriche) <= 0) {
        // Giorno di riposo → non genero presenza
        saltati++;
        continue;
      }

      const oreTeoriche = Number(giornoTpl.ore_teoriche);
      const orarioInizio = giornoTpl.orario_inizio ?? null;
      const orarioFine = giornoTpl.orario_fine ?? null;

      // INSERT presenza
      try {
        await pool.request()
          .input('dip_id', sql.Int, dipId)
          .input('data', sql.Date, isoDate)
          .input('in1', sql.Time, orarioInizio)
          .input('out1', sql.Time, orarioFine)
          .input('ore_teoriche', sql.Decimal(5, 2), oreTeoriche)
          .input('ore_lavorate', sql.Decimal(5, 2), oreTeoriche)
          .input('ore_pausa', sql.Decimal(5, 2), 0)
          .input('ore_nette', sql.Decimal(5, 2), oreTeoriche)
          .input('stato', sql.NVarChar(20), 'lavorata_auto')
          .input('nota', sql.NVarChar(500), 'Generata automaticamente (non timbrante)')
          .query(`
            INSERT INTO CFXX_HR_PRESENZE
              (dip_id, data, in1, out1, ore_teoriche, ore_lavorate, ore_pausa, ore_nette, stato, nota, data_mod)
            VALUES
              (@dip_id, @data, @in1, @out1, @ore_teoriche, @ore_lavorate, @ore_pausa, @ore_nette, @stato, @nota, GETDATE())
          `);
        generate++;
      } catch (e: any) {
        errori.push(`${isoDate}: ${e.message}`);
      }
    }

    return NextResponse.json({
      ok: true,
      anno, mese,
      generate,
      saltati,
      errori: errori.slice(0, 20),
      totale_errori: errori.length,
    });
  } catch (err: any) {
    console.error('[API] POST /api/dipendenti/:id/presenze/auto-genera error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
