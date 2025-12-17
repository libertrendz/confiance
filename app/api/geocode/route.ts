// app/api/geocode/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function looksLikePtPostalCode(q: string) {
  return /^\d{4}-\d{3}$/.test(q.trim());
}

export async function GET(req: NextRequest) {
  try {
    let q = req.nextUrl.searchParams.get('q')?.trim() || '';
    if (!q) return NextResponse.json({ ok: false, error: 'Missing query param: q' }, { status: 400 });

    // Se for CP PT, ajuda a API acrescentando o país
    if (looksLikePtPostalCode(q)) q = `${q}, Portugal`;

    const url =
      'https://nominatim.openstreetmap.org/search?' +
      new URLSearchParams({
        q,
        format: 'json',
        limit: '5',
        addressdetails: '1',
        countrycodes: 'pt', // força Portugal
      }).toString();

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'CONFIANCE ERP (geocode) - Vercel',
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return NextResponse.json(
        { ok: false, error: `Geocode provider error (${res.status})`, detail: txt.slice(0, 500) },
        { status: 502 }
      );
    }

    const data = (await res.json()) as any[];
    const results =
      (data || []).map((r) => ({
        display_name: r.display_name as string,
        lat: Number(r.lat),
        lng: Number(r.lon),
      })) || [];

    return NextResponse.json({ ok: true, results }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unhandled geocode error' }, { status: 500 });
  }
}
