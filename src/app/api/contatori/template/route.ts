import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { getPool } from '@/lib/db';

// GET /api/contatori/template — Scarica template Excel per import saldi
export async function GET() {
  try {
    const pool = await getPool();

    // Prendi lista dipendenti per pre-compilare il template
    const dipRes = await pool.request().query(
      `SELECT id, matricola, nome, des_reparto, ore_settimanali FROM CFXX_HR_ANAG_DIP ORDER BY nome`
    );

    const wb = new ExcelJS.Workbook();
    wb.creator = 'PRIMED HR';

    // ── Foglio ISTRUZIONI ──
    const wsInfo = wb.addWorksheet('ISTRUZIONI');
    wsInfo.getColumn('A').width = 80;
    wsInfo.getCell('A1').value = 'TEMPLATE IMPORT SALDI — PRIMED HR';
    wsInfo.getCell('A1').font = { bold: true, size: 14 };
    wsInfo.getCell('A3').value = 'Questo file serve per importare i saldi mensili di Ferie, ROL, Banca Ore e BOP.';
    wsInfo.getCell('A4').value = 'Compilare il foglio "DATI" seguendo le istruzioni:';
    wsInfo.getCell('A6').value = '1. Ogni riga rappresenta i dati di UN dipendente per UN mese specifico';
    wsInfo.getCell('A7').value = '2. La colonna MATRICOLA è obbligatoria e deve corrispondere alla matricola nel gestionale';
    wsInfo.getCell('A8').value = '3. ANNO e MESE sono obbligatori (es. Anno=2026, Mese=4 per Aprile 2026)';
    wsInfo.getCell('A9').value = '4. I valori sono in ORE (es. 16 = 16 ore, 2.5 = 2 ore e 30 minuti)';
    wsInfo.getCell('A10').value = '5. MATURATE = ore accumulate nel mese, USATE = ore consumate nel mese';
    wsInfo.getCell('A11').value = '6. Se un valore non cambia, lasciare 0';
    wsInfo.getCell('A13').value = 'COLONNE:';
    wsInfo.getCell('A13').font = { bold: true };
    wsInfo.getCell('A14').value = '  MATRICOLA — Codice matricola del dipendente (obbligatorio)';
    wsInfo.getCell('A15').value = '  NOME — Nome del dipendente (solo riferimento, non importato)';
    wsInfo.getCell('A16').value = '  ANNO — Anno di riferimento (es. 2026)';
    wsInfo.getCell('A17').value = '  MESE — Mese di riferimento (1-12)';
    wsInfo.getCell('A18').value = '  FERIE_MATURATE — Ore ferie maturate nel mese';
    wsInfo.getCell('A19').value = '  FERIE_USATE — Ore ferie utilizzate nel mese';
    wsInfo.getCell('A20').value = '  ROL_MATURATO — Ore ROL maturate nel mese';
    wsInfo.getCell('A21').value = '  ROL_USATO — Ore ROL utilizzate nel mese';
    wsInfo.getCell('A22').value = '  BANCA_ORE — Ore accumulate in banca ore nel mese';
    wsInfo.getCell('A23').value = '  BANCA_ORE_USATA — Ore prelevate dalla banca ore nel mese';
    wsInfo.getCell('A24').value = '  BOP — Ore accumulate nel salvadanaio BOP nel mese';
    wsInfo.getCell('A25').value = '  BOP_USATO — Ore prelevate dal salvadanaio BOP nel mese';
    wsInfo.getCell('A26').value = '  NOTE — Note libere (opzionale)';

    // ── Foglio DATI (da compilare) ──
    const ws = wb.addWorksheet('DATI');

    // Header
    const headers = [
      'MATRICOLA', 'NOME', 'ANNO', 'MESE',
      'FERIE_MATURATE', 'FERIE_USATE',
      'ROL_MATURATO', 'ROL_USATO',
      'BANCA_ORE', 'BANCA_ORE_USATA',
      'BOP', 'BOP_USATO',
      'NOTE',
    ];

    const headerRow = ws.addRow(headers);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B5BDB' } };
    headerRow.alignment = { horizontal: 'center' };

    // Larghezze colonne
    ws.getColumn('A').width = 16; // MATRICOLA
    ws.getColumn('B').width = 30; // NOME
    ws.getColumn('C').width = 8;  // ANNO
    ws.getColumn('D').width = 8;  // MESE
    ws.getColumn('E').width = 18; // FERIE_MATURATE
    ws.getColumn('F').width = 14; // FERIE_USATE
    ws.getColumn('G').width = 16; // ROL_MATURATO
    ws.getColumn('H').width = 12; // ROL_USATO
    ws.getColumn('I').width = 14; // BANCA_ORE
    ws.getColumn('J').width = 18; // BANCA_ORE_USATA
    ws.getColumn('K').width = 10; // BOP
    ws.getColumn('L').width = 12; // BOP_USATO
    ws.getColumn('M').width = 30; // NOTE

    // Pre-compila con i dipendenti esistenti (mese/anno corrente)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    for (const dip of dipRes.recordset) {
      const row = ws.addRow([
        dip.matricola?.trim() ?? '',
        dip.nome?.trim() ?? '',
        currentYear,
        currentMonth,
        0, 0, // ferie
        0, 0, // rol
        0, 0, // banca ore
        0, 0, // bop
        '',   // note
      ]);
      // Colora le celle numeriche in giallo chiaro per indicare dove compilare
      for (let col = 5; col <= 12; col++) {
        row.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFDE7' } };
        row.getCell(col).numFmt = '0.00';
      }
    }

    // Genera buffer
    const buffer = await wb.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="template_saldi_${currentYear}_${String(currentMonth).padStart(2, '0')}.xlsx"`,
      },
    });
  } catch (err: any) {
    console.error('[API] GET /api/contatori/template error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
