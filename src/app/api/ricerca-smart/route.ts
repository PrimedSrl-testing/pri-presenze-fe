import { NextRequest, NextResponse } from 'next/server';

const MAGAZZINO_BASE = process.env.MAGAZZINO_API_URL || 'http://nodejs:3008';

export async function GET(req: NextRequest) {
  const search = req.nextUrl.search || '';
  const target = `${MAGAZZINO_BASE}/ricercaarticolicomponenti${search}`;

  try {
    const res = await fetch(target, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
    });
  } catch (e) {
    console.error('[ricerca-smart proxy root] errore:', e);
    return NextResponse.json(
      { error: 'Backend pri-magazzino non raggiungibile', target },
      { status: 502 }
    );
  }
}
