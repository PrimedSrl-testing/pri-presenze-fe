import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

type Ctx = { params: Promise<{ token: string }> };

// POST /api/self-service/:token/upload — Upload documento (CI, CF) da self-service
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { token } = await ctx.params;
    const pool = await getPool();

    const check = await pool.request().input('token', sql.NVarChar(100), token)
      .query('SELECT dip_id FROM CFXX_HR_DIP_CONFIG WHERE token_self_service = @token');

    if (check.recordset.length === 0) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 });
    }

    const dipId = check.recordset[0].dip_id;
    const fd = await req.formData();
    const file = fd.get('file') as File | null;
    const tipo = fd.get('tipo') as string;

    if (!file || !tipo) return NextResponse.json({ error: 'file e tipo obbligatori' }, { status: 400 });
    if (!['ci', 'cf'].includes(tipo)) return NextResponse.json({ error: 'tipo non valido' }, { status: 400 });

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'documenti', String(dipId));
    await mkdir(uploadDir, { recursive: true });
    const ext = path.extname(file.name) || '.pdf';
    const safeName = `${tipo}_${Date.now()}${ext}`;
    await writeFile(path.join(uploadDir, safeName), Buffer.from(await file.arrayBuffer()));
    const publicPath = `/uploads/documenti/${dipId}/${safeName}`;

    const colFile = tipo === 'ci' ? 'doc_ci_file' : 'doc_cf_file';
    const colFlag = tipo === 'ci' ? 'doc_carta_identita' : 'doc_codice_fiscale';

    await pool.request()
      .input('token', sql.NVarChar(100), token)
      .input('path', sql.NVarChar(500), publicPath)
      .query(`UPDATE CFXX_HR_DIP_CONFIG SET ${colFile} = @path, ${colFlag} = 1 WHERE token_self_service = @token`);

    return NextResponse.json({ path: publicPath });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
