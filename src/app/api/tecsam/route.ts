import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

// GET /api/tecsam?dip_id=&tipo=&stato=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dipId = searchParams.get('dip_id');
    const tipo = searchParams.get('tipo');
    const stato = searchParams.get('stato');

    const pool = await getPool();
    const request = pool.request();

    let where = '1=1';
    if (dipId) {
      request.input('dip_id', sql.Int, Number(dipId));
      where += ' AND t.dip_id = @dip_id';
    }
    if (tipo) {
      request.input('tipo', sql.NVarChar(30), tipo);
      where += ' AND t.tipo = @tipo';
    }
    if (stato) {
      request.input('stato', sql.NVarChar(20), stato);
      where += ' AND t.stato = @stato';
    }

    const result = await request.query(`
      SELECT t.*, d.nome AS dip_nome, d.matricola AS matricola
      FROM CFXX_HR_TECSAM t
      LEFT JOIN CFXX_HR_ANAG_DIP d ON d.id = t.dip_id
      WHERE ${where}
      ORDER BY
        CASE t.stato
          WHEN 'scaduta' THEN 0
          WHEN 'da_programmare' THEN 1
          WHEN 'programmata' THEN 2
          WHEN 'effettuata' THEN 3
        END,
        t.data_scadenza ASC
    `);

    return NextResponse.json(result.recordset.map(parseRow));
  } catch (err: any) {
    console.error('[API] GET /api/tecsam error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/tecsam
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pool = await getPool();

    if (!body.dip_id || !body.tipo || !body.descrizione) {
      return NextResponse.json(
        { error: 'dip_id, tipo e descrizione sono obbligatori' },
        { status: 400 }
      );
    }

    const result = await pool
      .request()
      .input('dip_id', sql.Int, body.dip_id)
      .input('tipo', sql.NVarChar(30), body.tipo)
      .input('descrizione', sql.NVarChar(500), body.descrizione)
      .input('data_scadenza', sql.Date, body.data_scadenza ?? null)
      .input('data_prossima', sql.Date, body.data_prossima ?? null)
      .input('data_effettuata', sql.Date, body.data_effettuata ?? null)
      .input('stato', sql.NVarChar(20), body.stato ?? 'da_programmare')
      .input('esito', sql.NVarChar(500), body.esito ?? null)
      .input('note', sql.NVarChar(sql.MAX), body.note ?? null)
      .input('creato_da', sql.NVarChar(100), body.creato_da ?? null)
      .query(`
        INSERT INTO CFXX_HR_TECSAM
          (dip_id, tipo, descrizione, data_scadenza, data_prossima,
           data_effettuata, stato, esito, note, creato_da)
        OUTPUT INSERTED.*
        VALUES
          (@dip_id, @tipo, @descrizione, @data_scadenza, @data_prossima,
           @data_effettuata, @stato, @esito, @note, @creato_da)
      `);

    return NextResponse.json(parseRow(result.recordset[0]), { status: 201 });
  } catch (err: any) {
    console.error('[API] POST /api/tecsam error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function parseRow(row: any) {
  return {
    id: row.id,
    dip_id: row.dip_id,
    tipo: row.tipo,
    descrizione: row.descrizione,
    data_scadenza: row.data_scadenza,
    data_prossima: row.data_prossima,
    data_effettuata: row.data_effettuata,
    stato: row.stato,
    esito: row.esito,
    note: row.note,
    creato_da: row.creato_da,
    dip_nome: row.dip_nome ?? null,
    matricola: row.matricola ?? null,
    data_ins: row.data_ins,
    data_mod: row.data_mod,
  };
}
