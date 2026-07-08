import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/dipendenti/:id/attestati
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const pool = await getPool();
    const result = await pool.request().input('dip_id', sql.Int, Number(id))
      .query(`SELECT * FROM CFXX_HR_ATTESTATI_FORMAZIONE WHERE dip_id = @dip_id ORDER BY data_corso DESC`);

    return NextResponse.json(result.recordset.map((r: any) => ({
      id: r.id, dip_id: r.dip_id, tecsam_id: r.tecsam_id,
      titolo: r.titolo, data_corso: r.data_corso, data_scadenza: r.data_scadenza,
      file_path: r.file_path,
      firma_datore: !!r.firma_datore, firma_datore_data: r.firma_datore_data,
      inviato_dipendente: !!r.inviato_dipendente, inviato_data: r.inviato_data,
      note: r.note,
    })));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/dipendenti/:id/attestati — Upload attestato (FormData: file + titolo + date)
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const fd = await req.formData();
    const file = fd.get('file') as File | null;
    const titolo = fd.get('titolo') as string;
    const data_corso = fd.get('data_corso') as string | null;
    const data_scadenza = fd.get('data_scadenza') as string | null;
    const tecsam_id = fd.get('tecsam_id') as string | null;
    const note = fd.get('note') as string | null;

    if (!titolo) return NextResponse.json({ error: 'Titolo obbligatorio' }, { status: 400 });

    let filePath: string | null = null;
    if (file) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'attestati', id);
      await mkdir(uploadDir, { recursive: true });
      const ext = path.extname(file.name) || '.pdf';
      const safeName = `attestato_${Date.now()}${ext}`;
      await writeFile(path.join(uploadDir, safeName), Buffer.from(await file.arrayBuffer()));
      filePath = `/uploads/attestati/${id}/${safeName}`;
    }

    const pool = await getPool();
    await pool.request()
      .input('dip_id', sql.Int, Number(id))
      .input('tecsam_id', sql.Int, tecsam_id ? Number(tecsam_id) : null)
      .input('titolo', sql.NVarChar(255), titolo)
      .input('data_corso', sql.Date, data_corso || null)
      .input('data_scadenza', sql.Date, data_scadenza || null)
      .input('file_path', sql.NVarChar(500), filePath)
      .input('note', sql.NVarChar(500), note || null)
      .query(`
        INSERT INTO CFXX_HR_ATTESTATI_FORMAZIONE
          (dip_id, tecsam_id, titolo, data_corso, data_scadenza, file_path, note)
        VALUES (@dip_id, @tecsam_id, @titolo, @data_corso, @data_scadenza, @file_path, @note)
      `);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/dipendenti/:id/attestati?id=XX
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const attId = searchParams.get('id');
    if (!attId) return NextResponse.json({ error: 'id obbligatorio' }, { status: 400 });

    const pool = await getPool();
    await pool.request().input('id', sql.Int, Number(attId))
      .query('DELETE FROM CFXX_HR_ATTESTATI_FORMAZIONE WHERE id = @id');

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
