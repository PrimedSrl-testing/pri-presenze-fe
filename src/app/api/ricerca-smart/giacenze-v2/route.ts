import { NextRequest, NextResponse } from 'next/server';

const MAGAZZINO_BASE = process.env.MAGAZZINO_API_URL || 'http://nodejs:3008';

// Accetta { cdaArts: string[] } e restituisce { [CDA_ART|PRG_ART]: GIACENZA_NEW }
// Fonte: /scarichi_produzione/disallineamentiGiacenze (vista RIC_GIAC_INTRANET_V2)
// Scopo: l'endpoint /ricercaarticolicomponenti usa la vista vecchia RIC_GIACENZE
// che può divergere dall'intranet; qui riallineiamo solo per questa pagina.
export async function POST(req: NextRequest) {
  let cdaArts: string[] = [];
  try {
    const body = await req.json();
    cdaArts = Array.isArray(body?.cdaArts) ? body.cdaArts.filter(Boolean) : [];
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 });
  }

  if (cdaArts.length === 0) {
    return NextResponse.json({ giacenze: {} });
  }

  // Sanifico: niente apici, solo caratteri ammessi
  const safe = cdaArts
    .map(s => String(s).replace(/'/g, "''"))
    .filter(s => /^[A-Z0-9_\-]+$/i.test(s));

  if (safe.length === 0) {
    return NextResponse.json({ giacenze: {} });
  }

  const inList = safe.map(s => `'${s}'`).join(',');
  const wheres = [`RIC_GIACENZE.CDA_ART IN (${inList})`];

  try {
    const res = await fetch(`${MAGAZZINO_BASE}/scarichi_produzione/disallineamentiGiacenze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ wheres }),
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `upstream ${res.status}`, detail: text }, { status: 502 });
    }

    type Row = { CDA_ART: string; PRG_ART: number; GIACENZA_NEW: number | null };
    const json = (await res.json()) as { data?: Row[] };
    const giacenze: Record<string, number | null> = {};
    for (const r of json.data ?? []) {
      giacenze[`${r.CDA_ART}|${r.PRG_ART}`] = r.GIACENZA_NEW;
    }
    return NextResponse.json({ giacenze });
  } catch (e) {
    console.error('[giacenze-v2] errore:', e);
    return NextResponse.json({ error: 'Backend non raggiungibile' }, { status: 502 });
  }
}
