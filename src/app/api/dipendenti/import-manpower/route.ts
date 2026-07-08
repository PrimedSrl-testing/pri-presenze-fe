import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

interface ManpowerRow {
  contratto: string;
  candidato: string;
  data_inizio: string;
  data_fine: string;
  indirizzo: string;
  localita: string;
  provincia: string;
  cap: string;
  telefono: string;
  data_nascita: string;
  luogo_nascita: string;
  codice_fiscale: string;
}

function parseCSV(csvText: string): ManpowerRow[] {
  csvText = csvText.replace(/^﻿/, '');
  const lines = csvText.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const rows: ManpowerRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split(';');
    if (c.length < 12) continue;
    rows.push({
      contratto: c[0]?.trim() ?? '',
      candidato: c[1]?.trim() ?? '',
      data_inizio: c[2]?.trim() ?? '',
      data_fine: c[3]?.trim() ?? '',
      indirizzo: c[4]?.trim() ?? '',
      localita: c[5]?.trim() ?? '',
      provincia: c[6]?.trim() ?? '',
      cap: c[7]?.trim() ?? '',
      telefono: c[8]?.trim() ?? '',
      data_nascita: c[9]?.trim() ?? '',
      luogo_nascita: c[10]?.trim() ?? '',
      codice_fiscale: c[11]?.trim().toUpperCase() ?? '',
    });
  }
  return rows;
}

// Parse DD/MM/YY o DD/MM/YYYY -> YYYY-MM-DD
function parseDate(s: string): string | null {
  if (!s || !s.trim()) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  let [, d, mo, y] = m;
  if (y.length === 2) {
    const yn = parseInt(y, 10);
    y = yn <= 30 ? '20' + y.padStart(2, '0') : '19' + y.padStart(2, '0');
  }
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

// Genere da CF (settima cifra del codice: se >40, F; altrimenti M)
function genereFromCF(cf: string): string | null {
  if (cf.length < 11) return null;
  const giorno = parseInt(cf.substring(9, 11), 10);
  if (isNaN(giorno)) return null;
  return giorno > 31 ? 'F' : 'M';
}

// Split "Cognome Nome" rispettando i cognomi composti noti
function splitCognomeName(full: string): { cognome: string; nome: string } {
  const t = full.trim();
  // Pattern noti di cognomi composti (Li Noci, De Carolis, D'Amicis ecc.)
  const composti = /^(Li\s+Noci|De\s+Carolis|D'Amicis|De\s+\w+|Di\s+\w+|Lo\s+\w+|La\s+\w+|Del\s+\w+|Della\s+\w+|Dello\s+\w+|Degli\s+\w+|Dal\s+\w+|Dalla\s+\w+|Dei\s+\w+|San\s+\w+|Santa\s+\w+)\s+(.+)$/i;
  const m = t.match(composti);
  if (m) return { cognome: m[1], nome: m[2] };
  const parts = t.split(/\s+/);
  if (parts.length === 1) return { cognome: parts[0], nome: '' };
  // Default: prima parola = cognome, resto = nome
  return { cognome: parts[0], nome: parts.slice(1).join(' ') };
}

// POST /api/dipendenti/import-manpower
// Accetta file CSV Manpower e inserisce le anagrafiche come SOMMINISTRATI.
// Reparto ereditato dal cognome di un dipendente già presente; altrimenti NULL.
// Skip dei record con CF già presente in DB (idempotenza).
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'File CSV obbligatorio' }, { status: 400 });

    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length === 0) return NextResponse.json({ error: 'Nessuna riga valida nel CSV' }, { status: 400 });

    const pool = await getPool();

    // Mappa cognome (UPPER) -> id_reparto/des_reparto del primo dipendente non cessato con quel cognome
    const dipRes = await pool.request().query(`
      SELECT d.id, d.nome, d.cognome, d.id_reparto, d.des_reparto, c.codice_fiscale
      FROM CFXX_HR_ANAG_DIP d
      LEFT JOIN CFXX_HR_DIP_CONFIG c ON c.dip_id = d.id
    `);

    const repartoByCognome = new Map<string, { id_reparto: number | null; des_reparto: string | null }>();
    const cfEsistenti = new Set<string>();
    for (const r of dipRes.recordset) {
      if (r.codice_fiscale) cfEsistenti.add(String(r.codice_fiscale).trim().toUpperCase());
      // Costruisci cognome (preferisci colonna cognome se presente, altrimenti prima parola di nome)
      let cog: string | null = r.cognome ? String(r.cognome).trim().toUpperCase() : null;
      if (!cog && r.nome) cog = String(r.nome).trim().toUpperCase().split(/\s+/)[0];
      if (cog && r.des_reparto && !repartoByCognome.has(cog)) {
        repartoByCognome.set(cog, { id_reparto: r.id_reparto ?? null, des_reparto: r.des_reparto ?? null });
      }
    }

    // Genera prossima matricola
    const matRes = await pool.request().query(
      `SELECT TOP 1 matricola FROM CFXX_HR_ANAG_DIP WHERE matricola IS NOT NULL ORDER BY id DESC`
    );
    const lastMat = matRes.recordset[0]?.matricola ?? '0000000000';
    let nextMatNum = (parseInt(String(lastMat).replace(/\D/g, '') || '0', 10) + 1);

    let importati = 0;
    let saltati = 0;
    const dettagli: any[] = [];

    for (const r of rows) {
      const cf = r.codice_fiscale;
      if (!cf || cf.length < 11) {
        saltati++;
        dettagli.push({ candidato: r.candidato, esito: 'CF mancante o non valido' });
        continue;
      }

      if (cfEsistenti.has(cf)) {
        saltati++;
        dettagli.push({ candidato: r.candidato, esito: `CF ${cf} già presente — saltato` });
        continue;
      }

      const { cognome, nome } = splitCognomeName(r.candidato);
      const cognomeUp = cognome.toUpperCase();
      const nomeUp = nome.toUpperCase();
      const fullName = `${cognomeUp} ${nomeUp}`.trim();

      // Match reparto per cognome
      const repartoMatch = repartoByCognome.get(cognomeUp);
      const idReparto = repartoMatch?.id_reparto ?? null;
      const desReparto = repartoMatch?.des_reparto ?? null;

      const matricola = String(nextMatNum).padStart(10, '0');
      nextMatNum++;

      const dataInizio = parseDate(r.data_inizio);
      const dataFine = parseDate(r.data_fine);
      const dataNascita = parseDate(r.data_nascita);
      const genere = genereFromCF(cf);

      try {
        // INSERT ANAG_DIP
        const anagRes = await pool.request()
          .input('matricola', sql.NVarChar(255), matricola)
          .input('nome', sql.NVarChar(255), fullName)
          .input('cognome', sql.NVarChar(100), cognomeUp)
          .input('prenome', sql.NVarChar(100), nomeUp)
          .input('des_contratto', sql.NVarChar(255), 'SOMMINISTRATO')
          .input('tipo_soggetto', sql.NVarChar(100), 'SOMMINISTRATO MANPOWER')
          .input('des_reparto', sql.NVarChar(255), desReparto)
          .input('id_reparto', sql.Float, idReparto)
          .input('data_inizio', sql.DateTime, dataInizio)
          .input('data_fine', sql.DateTime, dataFine)
          .input('ore_settimanali', sql.Float, 40)
          .input('cessato', sql.Bit, 0)
          .query(`
            INSERT INTO CFXX_HR_ANAG_DIP
              (matricola, nome, cognome, prenome, des_contratto, tipo_soggetto,
               des_reparto, id_reparto, data_inizio, data_fine, ore_settimanali, cessato)
            OUTPUT INSERTED.id
            VALUES
              (@matricola, @nome, @cognome, @prenome, @des_contratto, @tipo_soggetto,
               @des_reparto, @id_reparto, @data_inizio, @data_fine, @ore_settimanali, @cessato)
          `);

        const dipId = anagRes.recordset[0].id;

        // INSERT DIP_CONFIG
        await pool.request()
          .input('dip_id', sql.Int, dipId)
          .input('codice_fiscale', sql.NVarChar(16), cf)
          .input('telefono', sql.NVarChar(50), r.telefono || null)
          .input('data_nascita', sql.Date, dataNascita)
          .input('luogo_nascita', sql.NVarChar(100), r.luogo_nascita || null)
          .input('genere', sql.NVarChar(1), genere)
          .input('indirizzo', sql.NVarChar(255), r.indirizzo || null)
          .input('citta', sql.NVarChar(100), r.localita || null)
          .input('cap', sql.NVarChar(10), r.cap || null)
          .input('provincia', sql.NVarChar(5), r.provincia || null)
          .query(`
            INSERT INTO CFXX_HR_DIP_CONFIG
              (dip_id, codice_fiscale, telefono, data_nascita, luogo_nascita, genere,
               indirizzo, citta, cap, provincia,
               pausa_minuti, pausa_soglia_ore, pausa_auto, flg_bop, flg_boa, flg_bos,
               stagionale_gia_censito, kronos_attivo, data_ins,
               doc_carta_identita, doc_codice_fiscale, doc_c2_storico, doc_permesso_soggiorno, dati_da_verificare)
            VALUES
              (@dip_id, @codice_fiscale, @telefono, @data_nascita, @luogo_nascita, @genere,
               @indirizzo, @citta, @cap, @provincia,
               30, 8, 1, 0, 0, 0, 0, 0, GETDATE(),
               0, 0, 0, 0, 0)
          `);

        cfEsistenti.add(cf);
        importati++;
        dettagli.push({
          candidato: r.candidato,
          esito: `Inserito (matricola ${matricola})`,
          reparto: desReparto ?? 'NON ASSEGNATO',
        });
      } catch (e: any) {
        saltati++;
        dettagli.push({ candidato: r.candidato, esito: `Errore: ${e.message}` });
      }
    }

    return NextResponse.json({
      totale_righe: rows.length,
      importati,
      saltati,
      dettagli,
    });
  } catch (err: any) {
    console.error('[API] POST /api/dipendenti/import-manpower error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
