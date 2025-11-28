// app/api/revalidate/route.ts
// Rota app-router para revalidar paths via POST.
// SECRET embutido (inseguro). Trocar depois para process.env.REVALIDATE_SECRET.

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

const SECRET = 'confiance-reval-2025'; // <-- SEGREDO EMBUTIDO (INSEGuro). Substitui por env var depois.

export async function POST(req: Request) {
  if (!SECRET) {
    console.error('REVALIDATE_SECRET not set (file-embedded)');
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }

  const headerSecret = req.headers.get('x-revalidate-secret');
  const url = new URL(req.url);
  const qSecret = url.searchParams.get('secret');
  const provided = headerSecret ?? qSecret;

  if (!provided || provided !== SECRET) {
    return NextResponse.json({ error: 'Invalid or missing secret' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    body = {};
  }

  const singlePath: string | undefined = typeof body?.path === 'string' ? body.path : undefined;
  const paths: string[] = Array.isArray(body?.paths) ? body.paths : (singlePath ? [singlePath] : []);

  if (!paths.length) {
    return NextResponse.json({ error: 'Missing path(s) to revalidate' }, { status: 400 });
  }

  try {
    for (const p of paths) {
      const path = p.startsWith('/') ? p : `/${p}`;
      revalidatePath(path);
      console.log('revalidatePath called for', path);
    }
    return NextResponse.json({ revalidated: true, paths }, { status: 200 });
  } catch (err) {
    console.error('revalidate error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
