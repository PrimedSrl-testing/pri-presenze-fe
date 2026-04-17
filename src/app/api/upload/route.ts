import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// POST /api/upload — Upload file per documenti dipendente
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const dipId = formData.get('dip_id') as string | null;
    const tipo = formData.get('tipo') as string | null;

    if (!file || !dipId) {
      return NextResponse.json({ error: 'file e dip_id obbligatori' }, { status: 400 });
    }

    // Create directory per dipendente
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'documenti', dipId);
    await mkdir(uploadDir, { recursive: true });

    // Generate safe filename
    const ext = path.extname(file.name) || '.pdf';
    const safeName = `${tipo ?? 'doc'}_${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, safeName);

    // Write file
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Return public URL path
    const publicPath = `/uploads/documenti/${dipId}/${safeName}`;

    return NextResponse.json({ path: publicPath, filename: file.name });
  } catch (err: any) {
    console.error('[API] POST /api/upload error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
