import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';
import ExcelJS from 'exceljs';

// GET /api/export/consulente?anno=2026&settimana_da=1&settimana_a=12
// Generates Excel with ONLY payable hours (no BOB)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const anno = searchParams.get('anno');
    const settimana_da = searchParams.get('settimana_da');
    const settimana_a = searchParams.get('settimana_a');

    if (!anno || !settimana_da || !settimana_a) {
      return NextResponse.json(
        { error: 'Parametri obbligatori: anno, settimana_da, settimana_a' },
        { status: 400 }
      );
    }

    const pool = await getPool();
    const result = await pool
      .request()
      .input('anno', sql.Int, Number(anno))
      .input('sett_da', sql.Int, Number(settimana_da))
      .input('sett_a', sql.Int, Number(settimana_a))
      .query(`
        SELECT
          d.matricola,
          d.nome,
          b.settimana,
          b.anno,
          b.ore_contrattuali AS ore_ordinarie,
          b.ore_supplementari,
          b.ore_straordinario_pagabile AS ore_straordinario
        FROM CFXX_HR_BANCA_ORE b
        INNER JOIN CFXX_HR_ANAG_DIP d ON d.id = b.dip_id
        WHERE b.anno = @anno
          AND b.settimana BETWEEN @sett_da AND @sett_a
        ORDER BY d.nome, b.settimana
      `);

    // Build Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Primed HR';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Ore Consulente');

    // Define columns
    sheet.columns = [
      { header: 'Matricola', key: 'matricola', width: 12 },
      { header: 'Nome', key: 'nome', width: 30 },
      { header: 'Settimana', key: 'settimana', width: 12 },
      { header: 'Anno', key: 'anno', width: 8 },
      { header: 'Ore Ordinarie', key: 'ore_ordinarie', width: 15 },
      { header: 'Ore Supplementari', key: 'ore_supplementari', width: 18 },
      { header: 'Ore Straordinario', key: 'ore_straordinario', width: 18 },
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add data rows
    for (const row of result.recordset) {
      sheet.addRow({
        matricola: row.matricola,
        nome: row.nome,
        settimana: row.settimana,
        anno: row.anno,
        ore_ordinarie: Number(row.ore_ordinarie) || 0,
        ore_supplementari: Number(row.ore_supplementari) || 0,
        ore_straordinario: Number(row.ore_straordinario) || 0,
      });
    }

    // Number format for hour columns
    sheet.getColumn('ore_ordinarie').numFmt = '0.00';
    sheet.getColumn('ore_supplementari').numFmt = '0.00';
    sheet.getColumn('ore_straordinario').numFmt = '0.00';

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    const filename = `ore_consulente_${anno}_sett${settimana_da}-${settimana_a}.xlsx`;

    return new NextResponse(buffer as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error('[API] GET /api/export/consulente error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
