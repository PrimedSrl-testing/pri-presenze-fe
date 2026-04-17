import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getPool, sql } from '@/lib/db';

// GET /api/contatori/import — Prossimo mese da importare
export async function GET() {
  try {
    const pool = await getPool();
    const result = await pool.request().query(
      `SELECT TOP 1 anno, mese FROM CFXX_HR_SALDI ORDER BY anno DESC, mese DESC`
    );

    let nextAnno: number;
    let nextMese: number;
    let lastAnno: number | null = null;
    let lastMese: number | null = null;

    if (result.recordset.length === 0) {
      const now = new Date();
      nextAnno = now.getFullYear();
      nextMese = now.getMonth() + 1;
    } else {
      lastAnno = result.recordset[0].anno as number;
      lastMese = result.recordset[0].mese as number;
      if (lastMese === 12) { nextAnno = lastAnno + 1; nextMese = 1; }
      else { nextAnno = lastAnno; nextMese = lastMese + 1; }
    }

    return NextResponse.json({
      ultimo_importato: lastAnno ? { anno: lastAnno, mese: lastMese } : null,
      prossimo: { anno: nextAnno, mese: nextMese },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/contatori/import — Import saldi da Excel (.xls o .xlsx)
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const anno = Number(formData.get('anno'));
    const mese = Number(formData.get('mese'));

    if (!file) return NextResponse.json({ error: 'File obbligatorio' }, { status: 400 });
    if (!anno || !mese || mese < 1 || mese > 12) {
      return NextResponse.json({ error: 'Anno e mese obbligatori' }, { status: 400 });
    }

    // Leggi file con libreria xlsx (supporta .xls E .xlsx)
    const arrayBuf = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: 'buffer' });
    } catch (e: any) {
      return NextResponse.json({ error: `Impossibile leggere il file: ${e.message}` }, { status: 400 });
    }

    // Prendi il primo foglio
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return NextResponse.json({ error: 'Nessun foglio trovato' }, { status: 400 });

    const sheet = workbook.Sheets[sheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if (rows.length < 2) {
      return NextResponse.json({ error: `Foglio "${sheetName}" ha solo ${rows.length} righe (serve almeno header + 1 riga dati)` }, { status: 400 });
    }

    const pool = await getPool();

    // Mappa matricola -> dip_id (con tutte le varianti di padding)
    const dipRes = await pool.request().query(`SELECT id, matricola, nome FROM CFXX_HR_ANAG_DIP`);
    const matMap = new Map<string, number>();
    const nomeMap = new Map<string, number>();
    for (const d of dipRes.recordset) {
      if (d.matricola) {
        const m = d.matricola.trim();
        matMap.set(m, d.id);
        // Aggiungi varianti senza zeri iniziali
        const stripped = m.replace(/^0+/, '');
        if (stripped) matMap.set(stripped, d.id);
        // Aggiungi con vari padding
        for (const pad of [2, 3, 4, 5, 6, 8, 10]) {
          matMap.set(stripped.padStart(pad, '0'), d.id);
        }
      }
      if (d.nome) {
        // Mappa per nome normalizzato (per fallback)
        const nomeNorm = d.nome.trim().toUpperCase().replace(/\s+/g, ' ');
        nomeMap.set(nomeNorm, d.id);
      }
    }

    // Header: riga 0
    const headers = rows[0].map((h: any) =>
      String(h ?? '').trim().toLowerCase()
        .replace(/\s+/g, '_').replace(/[àáâ]/g, 'a').replace(/[èéê]/g, 'e')
        .replace(/[ìíî]/g, 'i').replace(/[òóô]/g, 'o').replace(/[ùúû]/g, 'u')
    );

    // Trova indice colonna per nome (cerca contiene)
    const findCol = (...names: string[]): number => {
      for (const n of names) {
        const idx = headers.findIndex(h => h.includes(n));
        if (idx >= 0) return idx;
      }
      return -1;
    };

    const COL_MAT = findCol('matricola');
    const COL_NOME = findCol('cognome', 'nome');
    const COL_FERIE_AP = findCol('ferie_ap', 'ferie_a.p', 'ferie_anno_prec');
    const COL_FERIE_MAT = findCol('ferie_matura', 'ferie_mat');
    const COL_FERIE_GOD = findCol('ferie_god', 'ferie_godu');
    const COL_FERIE_RES = findCol('ferie_resid', 'ferie_res');
    const COL_ROL_AP = findCol('rol_ap', 'rol_a.p', 'rol_anno_prec');
    const COL_ROL_MAT = findCol('rol_matura', 'rol_mat');
    const COL_ROL_GOD = findCol('rol_god', 'rol_godu');
    const COL_ROL_RES = findCol('rol_resid', 'rol_res');
    const COL_BO_AP = findCol('banca_ore_ap', 'banca_ore_a.p', 'banca_ore_anno');
    const COL_BO_MAT = findCol('banca_ore_mat', 'banca_ore_matura');
    const COL_BO_GOD = findCol('banca_ore_god', 'banca_ore_godu');
    const COL_BO_RES = findCol('banca_ore_res', 'banca_ore_resid');

    if (COL_MAT < 0) {
      return NextResponse.json(
        { error: `Colonna MATRICOLA non trovata. Colonne nel file: ${headers.join(', ')}` },
        { status: 400 }
      );
    }

    const getNum = (row: any[], col: number): number => {
      if (col < 0 || col >= row.length) return 0;
      const v = row[col];
      if (v == null || v === '') return 0;
      const n = Number(String(v).replace(',', '.'));
      return isNaN(n) ? 0 : Math.round(n * 100) / 100;
    };

    let importati = 0;
    let saltati = 0;
    const errori: string[] = [];

    // Righe dati: da riga 1 in poi
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const matRaw = String(row[COL_MAT] ?? '').trim();
      if (!matRaw || matRaw === '0' || matRaw === '') continue;

      // Prova match: matricola diretta, senza zeri, con padding, poi nome
      const matricola = matRaw;
      let dipId = matMap.get(matricola);

      if (!dipId && COL_NOME >= 0) {
        const nomeRaw = String(row[COL_NOME] ?? '').trim().toUpperCase().replace(/\s+/g, ' ');
        if (nomeRaw) {
          // 1. Match esatto
          dipId = nomeMap.get(nomeRaw);

          if (!dipId) {
            // 2. Normalizza: rimuovi apostrofi, accenti, trattini
            const normalize = (s: string) => s.toUpperCase().replace(/[''`]/g, '').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
            const nomeNorm = normalize(nomeRaw);
            for (const [dbNome, dbId] of nomeMap.entries()) {
              if (normalize(dbNome) === nomeNorm) { dipId = dbId; break; }
            }
          }

          if (!dipId) {
            // 3. Inverti cognome/nome: "ROSSI MARCO" <-> "MARCO ROSSI"
            const parts = nomeRaw.split(' ');
            if (parts.length >= 2) {
              const invertito = parts.slice(1).join(' ') + ' ' + parts[0];
              dipId = nomeMap.get(invertito);
              if (!dipId) {
                const normalize = (s: string) => s.toUpperCase().replace(/[''`]/g, '').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
                const invNorm = normalize(invertito);
                for (const [dbNome, dbId] of nomeMap.entries()) {
                  if (normalize(dbNome) === invNorm) { dipId = dbId; break; }
                }
              }
            }
          }

          if (!dipId) {
            // 4. Parole contenute (senza spazi/apostrofi, unendo tutto)
            const flatten = (s: string) => s.replace(/[''`\s-]/g, '').toUpperCase();
            const fileFlat = flatten(nomeRaw);
            for (const [dbNome, dbId] of nomeMap.entries()) {
              const dbFlat = flatten(dbNome);
              if (fileFlat === dbFlat || dbFlat.includes(fileFlat) || fileFlat.includes(dbFlat)) {
                dipId = dbId; break;
              }
            }
          }

          if (!dipId) {
            // 5. Fuzzy: parole con tolleranza (ultima lettera, 1 char diverso)
            const words = nomeRaw.replace(/[''`\-]/g, ' ').split(/\s+/).filter(w => w.length >= 3);
            if (words.length >= 1) {
              for (const [dbNome, dbId] of nomeMap.entries()) {
                const dbClean = dbNome.replace(/[''`\-]/g, ' ').toUpperCase();
                const dbWords = dbClean.split(/\s+/).filter(w => w.length >= 3);
                const allFound = words.every(w => {
                  if (dbClean.includes(w)) return true;
                  if (w.length >= 5 && dbClean.includes(w.slice(0, -1))) return true;
                  // Tolleranza 1 carattere diverso (GAPITO vs GABITO)
                  return dbWords.some(dw => dw.length === w.length && levenshtein1(w, dw));
                });
                if (allFound) { dipId = dbId; break; }
              }
            }
          }
        }
      }

      if (!dipId) {
        const nomeInfo = COL_NOME >= 0 ? ` (${String(row[COL_NOME] ?? '').trim()})` : '';
        errori.push(`Riga ${i + 1}: Matricola "${matricola}"${nomeInfo} non trovata`);
        saltati++;
        continue;
      }

      try {
        await pool.request()
          .input('dip_id', sql.Int, dipId)
          .input('anno', sql.Int, anno)
          .input('mese', sql.Int, mese)
          .input('ferie_ap', sql.Decimal(6, 2), getNum(row, COL_FERIE_AP))
          .input('ferie_maturate', sql.Decimal(6, 2), getNum(row, COL_FERIE_MAT))
          .input('ferie_usate', sql.Decimal(6, 2), getNum(row, COL_FERIE_GOD))
          .input('ferie_residuo', sql.Decimal(6, 2), getNum(row, COL_FERIE_RES))
          .input('rol_ap', sql.Decimal(6, 2), getNum(row, COL_ROL_AP))
          .input('rol_maturato', sql.Decimal(6, 2), getNum(row, COL_ROL_MAT))
          .input('rol_usato', sql.Decimal(6, 2), getNum(row, COL_ROL_GOD))
          .input('rol_residuo', sql.Decimal(6, 2), getNum(row, COL_ROL_RES))
          .input('banca_ore_ap', sql.Decimal(6, 2), getNum(row, COL_BO_AP))
          .input('banca_ore', sql.Decimal(6, 2), getNum(row, COL_BO_MAT))
          .input('banca_ore_usata', sql.Decimal(6, 2), getNum(row, COL_BO_GOD))
          .input('banca_ore_residuo', sql.Decimal(6, 2), getNum(row, COL_BO_RES))
          .query(`
            MERGE CFXX_HR_SALDI AS t
            USING (SELECT @dip_id AS dip_id, @anno AS anno, @mese AS mese) AS s
            ON t.dip_id = s.dip_id AND t.anno = s.anno AND t.mese = s.mese
            WHEN MATCHED THEN UPDATE SET
              ferie_ap=@ferie_ap, ferie_maturate=@ferie_maturate, ferie_usate=@ferie_usate, ferie_residuo=@ferie_residuo,
              rol_ap=@rol_ap, rol_maturato=@rol_maturato, rol_usato=@rol_usato, rol_residuo=@rol_residuo,
              banca_ore_ap=@banca_ore_ap, banca_ore=@banca_ore, banca_ore_usata=@banca_ore_usata, banca_ore_residuo=@banca_ore_residuo,
              data_mod=GETDATE()
            WHEN NOT MATCHED THEN INSERT
              (dip_id, anno, mese, ferie_ap, ferie_maturate, ferie_usate, ferie_residuo,
               rol_ap, rol_maturato, rol_usato, rol_residuo,
               banca_ore_ap, banca_ore, banca_ore_usata, banca_ore_residuo)
            VALUES
              (@dip_id, @anno, @mese, @ferie_ap, @ferie_maturate, @ferie_usate, @ferie_residuo,
               @rol_ap, @rol_maturato, @rol_usato, @rol_residuo,
               @banca_ore_ap, @banca_ore, @banca_ore_usata, @banca_ore_residuo);
          `);
        importati++;
      } catch (dbErr: any) {
        errori.push(`Riga ${i + 1}: ${dbErr.message}`);
        saltati++;
      }
    }

    return NextResponse.json({ importati, saltati, errori: errori.slice(0, 20), totale_errori: errori.length });
  } catch (err: any) {
    console.error('[API] POST /api/contatori/import error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Max 1 carattere diverso (stessa lunghezza)
function levenshtein1(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) diff++;
    if (diff > 1) return false;
  }
  return diff === 1;
}
