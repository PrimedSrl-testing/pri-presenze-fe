import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

interface Row {
  matricola: string;
  codice_fiscale: string;
  cognome: string;
  nome: string;
  data_nascita: string;
  sesso: string;
  comune_nascita: string;
  comune_residenza: string;
  indirizzo: string;
  stato_civile: string;
  percentuale_disabile: string;
  titolo_studio: string;
  lingua: string;
  email: string;
  tipo_soggetto: string;
  tipo_assunzione_inps: string;
  data_assunzione: string;
  data_termine: string;
  data_trasformazione: string;
  data_cessazione: string;
  qualifica_inps: string;
  livello: string;
  mansione: string;
  ore_settimanali: string;
  percentuale_pt: string;
  cod_qualifica_professionale: string;
  qualifica_professionale: string;
}

function parseCSV(csvText: string): Row[] {
  // Rimuovi BOM se presente
  csvText = csvText.replace(/^﻿/, '');
  const lines = csvText.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  // Parse header per trovare indici colonne
  const headers = lines[0].split(';').map(h => h.trim().toLowerCase());
  const colIdx = (name: string): number => headers.findIndex(h => h === name.toLowerCase());

  const COL = {
    matricola: colIdx('matricola'),
    cf: colIdx('codice fiscale'),
    cognome: colIdx('cognome'),
    nome: colIdx('nome'),
    data_nascita: colIdx('data di nascita'),
    sesso: colIdx('sesso'),
    com_nascita: colIdx('comune di nascita'),
    com_residenza: colIdx('comune di residenza'),
    indirizzo: colIdx('indirizzo'),
    stato_civile: colIdx('stato civile'),
    disabile: colIdx('% disabile'),
    titolo: colIdx('titolo di studio'),
    lingua: colIdx('lingua'),
    email: colIdx('indirizzo e-mail'),
    tipo_sogg: colIdx('tipo soggetto'),
    tipo_ass: colIdx('tipo assunzione'),
    data_ass: colIdx('data di assunzione'),
    data_term: colIdx('data termine contratto'),
    data_trasf: colIdx('data trasformazione rapporto'),
    data_cess: colIdx('data cessazione'),
    qual_inps: colIdx('qualifica inps'),
    livello: colIdx('livello'),
    mansione: colIdx('mansione'),
    ore_sett: colIdx('ore settimanali'),
    pct_pt: colIdx('% part-time'),
    cod_qp: colIdx('codice qualifica professionale'),
    qp: colIdx('qualifica professionale'),
  };

  const rows: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(';');
    if (cells.length < 5) continue;
    const cf = cells[COL.cf]?.trim() ?? '';
    if (!cf) continue;

    rows.push({
      matricola: cells[COL.matricola]?.trim() ?? '',
      codice_fiscale: cf.toUpperCase(),
      cognome: cells[COL.cognome]?.trim() ?? '',
      nome: cells[COL.nome]?.trim() ?? '',
      data_nascita: cells[COL.data_nascita]?.trim() ?? '',
      sesso: cells[COL.sesso]?.trim() ?? '',
      comune_nascita: cells[COL.com_nascita]?.trim() ?? '',
      comune_residenza: cells[COL.com_residenza]?.trim() ?? '',
      indirizzo: cells[COL.indirizzo]?.trim() ?? '',
      stato_civile: cells[COL.stato_civile]?.trim() ?? '',
      percentuale_disabile: cells[COL.disabile]?.trim() ?? '',
      titolo_studio: cells[COL.titolo]?.trim() ?? '',
      lingua: cells[COL.lingua]?.trim() ?? '',
      email: cells[COL.email]?.trim() ?? '',
      tipo_soggetto: cells[COL.tipo_sogg]?.trim() ?? '',
      tipo_assunzione_inps: cells[COL.tipo_ass]?.trim() ?? '',
      data_assunzione: cells[COL.data_ass]?.trim() ?? '',
      data_termine: cells[COL.data_term]?.trim() ?? '',
      data_trasformazione: cells[COL.data_trasf]?.trim() ?? '',
      data_cessazione: cells[COL.data_cess]?.trim() ?? '',
      qualifica_inps: cells[COL.qual_inps]?.trim() ?? '',
      livello: cells[COL.livello]?.trim() ?? '',
      mansione: cells[COL.mansione]?.trim() ?? '',
      ore_settimanali: cells[COL.ore_sett]?.trim() ?? '',
      percentuale_pt: cells[COL.pct_pt]?.trim() ?? '',
      cod_qualifica_professionale: cells[COL.cod_qp]?.trim() ?? '',
      qualifica_professionale: cells[COL.qp]?.trim() ?? '',
    });
  }
  return rows;
}

// Parse data italiana DD/MM/YYYY -> YYYY-MM-DD
function parseDate(s: string): string | null {
  if (!s || s.trim() === '') return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function parseNum(s: string): number | null {
  if (!s || s.trim() === '') return null;
  const n = Number(s.replace(',', '.'));
  return isNaN(n) ? null : n;
}

function mapGenere(s: string): string | null {
  const up = s.trim().toUpperCase();
  if (up === 'M' || up === 'F') return up;
  return null;
}

function isCessato(row: Row): boolean {
  // Cessato se data_cessazione presente OPPURE data_termine gia passata
  if (row.data_cessazione && row.data_cessazione.trim()) return true;
  const term = parseDate(row.data_termine);
  if (term && new Date(term) < new Date()) return true;
  return false;
}

// POST /api/dipendenti/import-csv — Cancella tutto e importa il CSV
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const confermaCancella = formData.get('conferma_cancella') as string;

    if (!file) return NextResponse.json({ error: 'File CSV obbligatorio' }, { status: 400 });
    if (confermaCancella !== 'SI') {
      return NextResponse.json({ error: 'Conferma cancellazione mancante (conferma_cancella=SI)' }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Nessuna riga valida nel CSV' }, { status: 400 });
    }

    const pool = await getPool();

    // ── STEP 1: Cancellazione tabelle collegate ────────────────────────────
    const tablesToClean = [
      'CFXX_HR_DOCUMENTI_FIRMATI',
      'CFXX_HR_ATTESTATI_FORMAZIONE',
      'CFXX_HR_BOP_MOVIMENTI',
      'CFXX_HR_TECSAM',
      'CFXX_HR_SALDI',
      'CFXX_HR_STORICO_CONTRATTI',
      'CFXX_HR_DIP_ORARIO',
      'CFXX_HR_DIP_REGOLE',
      'CFXX_HR_CONTRATTI_CICLICI',
      'CFXX_HR_BANCA_ORE',
      'CFXX_HR_PRESENZE',
      'CFXX_HR_DOCUMENTI',
      'CFXX_HR_ASSUNZIONI',
      'CFXX_HR_DIP_CONFIG',
      'CFXX_HR_ANAG_DIP',
    ];

    for (const tbl of tablesToClean) {
      try {
        await pool.request().query(`DELETE FROM ${tbl}`);
      } catch (e: any) {
        // Ignora se la tabella non esiste
        if (!e.message?.includes('Invalid object name')) {
          console.error(`Errore cleanup ${tbl}:`, e.message);
        }
      }
    }

    // Reset IDENTITY
    try { await pool.request().query(`DBCC CHECKIDENT ('CFXX_HR_ANAG_DIP', RESEED, 0)`); } catch {}

    // ── STEP 2: Import righe ───────────────────────────────────────────────
    let importati = 0;
    const errori: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const fullName = `${row.cognome} ${row.nome}`.trim().toUpperCase();
        const dataInizio = parseDate(row.data_assunzione);
        const dataFine = parseDate(row.data_termine);
        const dataTrasf = parseDate(row.data_trasformazione);
        const dataCess = parseDate(row.data_cessazione);
        const dataNascita = parseDate(row.data_nascita);
        const cessato = isCessato(row);
        const oreSett = parseNum(row.ore_settimanali) ?? 0;
        const pctPt = parseNum(row.percentuale_pt);
        const pctDis = parseNum(row.percentuale_disabile);

        // Genera matricola padded (es. "1" -> "0000000001")
        const matPadded = (row.matricola || '').padStart(10, '0');

        // Mappa tipo_soggetto -> des_contratto
        let desContratto = row.tipo_soggetto;
        if (row.tipo_soggetto.toLowerCase().includes('indeterminato')) desContratto = 'INDETERMINATO';
        else if (row.tipo_soggetto.toLowerCase().includes('determinato')) desContratto = 'DETERMINATO';
        else if (row.tipo_soggetto.toLowerCase().includes('stage') || row.tipo_soggetto.toLowerCase().includes('tirocinio')) desContratto = 'STAGE';
        else if (row.tipo_soggetto.toLowerCase().includes('parasubordinato')) desContratto = 'PARASUBORDINATO';

        // Insert ANAG_DIP
        const anagRes = await pool.request()
          .input('matricola', sql.NVarChar(255), matPadded)
          .input('nome', sql.NVarChar(255), fullName)
          .input('cognome', sql.NVarChar(100), row.cognome.toUpperCase())
          .input('prenome', sql.NVarChar(100), row.nome.toUpperCase())
          .input('des_contratto', sql.NVarChar(255), desContratto)
          .input('data_inizio', sql.DateTime, dataInizio)
          .input('data_fine', sql.DateTime, dataFine)
          .input('ore_settimanali', sql.Float, oreSett)
          .input('tipo_soggetto', sql.NVarChar(100), row.tipo_soggetto || null)
          .input('data_trasformazione', sql.Date, dataTrasf)
          .input('data_cessazione', sql.Date, dataCess)
          .input('cessato', sql.Bit, cessato ? 1 : 0)
          .input('qualifica_inps', sql.NVarChar(50), row.qualifica_inps || null)
          .input('livello_contrattuale', sql.NVarChar(30), row.livello || null)
          .input('mansione_desc', sql.NVarChar(255), row.mansione || null)
          .input('percentuale_part_time', sql.Decimal(5, 2), pctPt)
          .input('cod_qualifica_professionale', sql.NVarChar(50), row.cod_qualifica_professionale || null)
          .input('qualifica_professionale', sql.NVarChar(255), row.qualifica_professionale || null)
          .query(`
            INSERT INTO CFXX_HR_ANAG_DIP
              (matricola, nome, cognome, prenome, des_contratto,
               data_inizio, data_fine, ore_settimanali,
               tipo_soggetto, data_trasformazione, data_cessazione, cessato,
               qualifica_inps, livello_contrattuale, mansione_desc,
               percentuale_part_time, cod_qualifica_professionale, qualifica_professionale)
            OUTPUT INSERTED.id
            VALUES
              (@matricola, @nome, @cognome, @prenome, @des_contratto,
               @data_inizio, @data_fine, @ore_settimanali,
               @tipo_soggetto, @data_trasformazione, @data_cessazione, @cessato,
               @qualifica_inps, @livello_contrattuale, @mansione_desc,
               @percentuale_part_time, @cod_qualifica_professionale, @qualifica_professionale)
          `);

        const dipId = anagRes.recordset[0].id;

        // Insert DIP_CONFIG
        await pool.request()
          .input('dip_id', sql.Int, dipId)
          .input('codice_fiscale', sql.NVarChar(16), row.codice_fiscale)
          .input('email', sql.NVarChar(255), row.email || null)
          .input('data_nascita', sql.Date, dataNascita)
          .input('luogo_nascita', sql.NVarChar(100), row.comune_nascita || null)
          .input('genere', sql.NVarChar(1), mapGenere(row.sesso))
          .input('nazionalita', sql.NVarChar(50), row.lingua || null)
          .input('indirizzo', sql.NVarChar(255), row.indirizzo || null)
          .input('citta', sql.NVarChar(100), row.comune_residenza || null)
          .input('stato_civile', sql.NVarChar(30), row.stato_civile || null)
          .input('percentuale_disabile', sql.Decimal(5, 2), pctDis)
          .input('titolo_studio', sql.NVarChar(100), row.titolo_studio || null)
          .input('lingua', sql.NVarChar(50), row.lingua || null)
          .query(`
            INSERT INTO CFXX_HR_DIP_CONFIG
              (dip_id, codice_fiscale, email, data_nascita, luogo_nascita, genere, nazionalita,
               indirizzo, citta, stato_civile, percentuale_disabile, titolo_studio, lingua,
               pausa_minuti, pausa_soglia_ore, pausa_auto, flg_bop, flg_boa, flg_bos,
               stagionale_gia_censito, kronos_attivo, data_ins)
            VALUES
              (@dip_id, @codice_fiscale, @email, @data_nascita, @luogo_nascita, @genere, @nazionalita,
               @indirizzo, @citta, @stato_civile, @percentuale_disabile, @titolo_studio, @lingua,
               30, 8, 1, 0, 0, 0, 0, 0, GETDATE())
          `);

        importati++;
      } catch (e: any) {
        errori.push(`Riga ${i + 2} (${row.cognome} ${row.nome} / ${row.codice_fiscale}): ${e.message}`);
      }
    }

    return NextResponse.json({
      totale_righe: rows.length,
      importati,
      errori: errori.slice(0, 30),
      totale_errori: errori.length,
    });
  } catch (err: any) {
    console.error('[API] POST /api/dipendenti/import-csv error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
