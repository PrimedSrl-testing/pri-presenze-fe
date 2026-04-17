import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/tecsam/:id
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const pool = await getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, Number(id))
      .query(`
        SELECT t.*, d.nome AS dip_nome, d.matricola AS matricola
        FROM CFXX_HR_TECSAM t
        LEFT JOIN CFXX_HR_ANAG_DIP d ON d.id = t.dip_id
        WHERE t.id = @id
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json({ error: 'Record non trovato' }, { status: 404 });
    }

    return NextResponse.json(parseRow(result.recordset[0]));
  } catch (err: any) {
    console.error('[API] GET /api/tecsam/:id error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT /api/tecsam/:id
export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const pool = await getPool();

    const result = await pool
      .request()
      .input('id', sql.Int, Number(id))
      .input('tipo', sql.NVarChar(30), body.tipo)
      .input('descrizione', sql.NVarChar(500), body.descrizione)
      .input('data_scadenza', sql.Date, body.data_scadenza ?? null)
      .input('data_prossima', sql.Date, body.data_prossima ?? null)
      .input('data_effettuata', sql.Date, body.data_effettuata ?? null)
      .input('stato', sql.NVarChar(20), body.stato)
      .input('esito', sql.NVarChar(500), body.esito ?? null)
      .input('note', sql.NVarChar(sql.MAX), body.note ?? null)
      .query(`
        UPDATE CFXX_HR_TECSAM SET
          tipo = @tipo, descrizione = @descrizione,
          data_scadenza = @data_scadenza, data_prossima = @data_prossima,
          data_effettuata = @data_effettuata, stato = @stato,
          esito = @esito, note = @note,
          data_mod = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json({ error: 'Record non trovato' }, { status: 404 });
    }

    return NextResponse.json(parseRow(result.recordset[0]));
  } catch (err: any) {
    console.error('[API] PUT /api/tecsam/:id error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/tecsam/:id
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const pool = await getPool();
    await pool
      .request()
      .input('id', sql.Int, Number(id))
      .query('DELETE FROM CFXX_HR_TECSAM WHERE id = @id');

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[API] DELETE /api/tecsam/:id error:', err);
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
