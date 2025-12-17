// app/api/geocode/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function normalizePtPostalCode(q: string) {
  const s = q.trim();

  // aceita "####-###"
  if (/^\d{4}-\d{3}$/.test(s)) return s;

  // aceita "#### ###"
  const m1 = s.match(/^(\d{4})\s(\d{3})$/);
  if (m1) return `${m1[1]}-${m1[2]}`;

  // aceita "#######"
  const m2 = s.match(/^(\d{4})(\d{3})$/);
  if (m2) return `${m2[1]}-${m2[2]}`;

  return null;
}

async function fetchNominatim(q: string, countrycodes?: string) {
  const params = new URLSearchParams({
    q,
    format: 'json',
    limit: '5',
    addressdetails: '1',
  });

  if (countrycodes) params.set('countrycodes', countrycodes);

  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'CONFIANCE ERP (geocode) - Vercel',
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    return { ok: false as const, status: res.status, detail: txt.slice(0, 500), data: [] as any[] };
  }

  const data = (await res.json()) as any[];
  return { ok: true as const, status: 200, detail: null, data: data || [] };
}

export async function GET(req: NextRequest) {
  try {
    let q = req.nextUrl.searchParams.get('q')?.trim() || '';
    if (!q) return NextResponse.json({ ok: false, error: 'Missing query param: q' }, { status: 400 });

    // normaliza CP PT
    const norm = normalizePtPostalCode(q);
    if (norm) q = `${norm}, Portugal`;

    // tentativa 1: restringe a PT
    const r1 = await fetchNominatim(q, 'pt');

    // se deu erro no provider
    if (!r1.ok) {
      return NextResponse.json(
        { ok: false, error: `Geocode provider error (${r1.status})`, detail: r1.detail },
        { status: 502 }
      );
    }

    let data = r1.data;

    // tentativa 2: se veio vazio, tenta sem countrycodes, mas garantindo "Portugal"
    if (!data.length) {
      const q2 = q.toLowerCase().includes('portugal') ? q : `${q}, Portugal`;
      const r2 = await fetchNominatim(q2);
      if (r2.ok) data = r2.data;
    }

    const results = (data || []).map((r) => ({
      display_name: String(r.display_name || ''),
      lat: Number(r.lat),
      lng: Number(r.lon),
    }));

    return NextResponse.json({ ok: true, results }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unhandled geocode error' }, { status: 500 });
  }
}
