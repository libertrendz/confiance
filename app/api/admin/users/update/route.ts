// app/api/admin/users/update/route.ts
// Atualização: prioriza a tabela 'profiles' (se existir), com fallbacks.
// Substitui todo o ficheiro por este conteúdo.

import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL || 'https://erp-confiance.vercel.app';

function makeSupabaseClient(): { client?: SupabaseClient; missing?: string[] } {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;

  const missing: string[] = [];
  if (!SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY | SUPABASE_SERVICE_ROLE');

  if (missing.length) return { missing };

  const client = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
  });
  return { client };
}

async function tryUpdateTable(client: SupabaseClient, tableName: string, userId: string, empresaId: string, updates: Record<string, any>) {
  try {
    const { data, error } = await client
      .from(tableName)
      .update(updates)
      .eq('id', userId)
      .eq('empresa_id', empresaId)
      .select('*')
      .single();
    if (error) return { ok: false, error, data: null };
    return { ok: true, data, error: null };
  } catch (err: any) {
    return { ok: false, error: err, data: null };
  }
}

export async function POST(req: Request) {
  try {
    const provided = req.headers.get('x-admin-secret');
    const API_ADMIN_SECRET = process.env.API_ADMIN_SECRET;
    if (!API_ADMIN_SECRET) {
      console.error('API_ADMIN_SECRET missing');
      return NextResponse.json({ ok: false, error: 'Server misconfigured (API_ADMIN_SECRET)' }, { status: 500 });
    }
    if (!provided || provided !== API_ADMIN_SECRET) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 });

    const userId = body.userId as string | undefined;
    const empresaId = body.empresaId as string | undefined;
    const updates = body.updates as Record<string, any> | undefined;

    if (!userId) return NextResponse.json({ ok: false, error: 'Missing userId' }, { status: 400 });
    if (!empresaId) return NextResponse.json({ ok: false, error: 'Missing empresaId' }, { status: 400 });
    if (!updates || typeof updates !== 'object') return NextResponse.json({ ok: false, error: 'Missing updates' }, { status: 400 });

    const { client, missing } = makeSupabaseClient();
    if (missing && missing.length) {
      console.error('Missing env:', missing);
      return NextResponse.json({ ok: false, error: `Missing env: ${missing.join(', ')}` }, { status: 500 });
    }
    if (!client) {
      return NextResponse.json({ ok: false, error: 'Could not initialize DB client' }, { status: 500 });
    }

    // protections
    delete updates.id;
    updates.empresa_id = empresaId;

    // Try candidates in order: prefer 'profiles'
    const candidates = ['profiles', 'profile', 'users', 'user'];

    let finalResult: any = null;
    const tried: Record<string, string | null> = {};

    for (const t of candidates) {
      const r = await tryUpdateTable(client, t, userId, empresaId, updates);
      if (r.ok) {
        finalResult = { table: t, data: r.data };
        tried[t] = null;
        break;
      } else {
        const msg = (r.error && (r.error.message || r.error.msg || String(r.error))) || String(r.error);
        tried[t] = msg;
        const tableNotFound = msg.toLowerCase().includes('could not find the table') || msg.toLowerCase().includes('does not exist') || msg.toLowerCase().includes('not found');
        if (!tableNotFound) {
          console.error('DB error on candidate', t, msg);
          return NextResponse.json({ ok: false, error: 'DB update error', detail: { table: t, error: msg } }, { status: 500 });
        }
        // else continue
      }
    }

    if (!finalResult) {
      return NextResponse.json({
        ok: false,
        error: 'No matching table found. Inspect "tried" for details.',
        tried
      }, { status: 500 });
    }

    // Insert audit if available (non-blocking)
    try { await client.from('profile_audit').insert({ empresa_id: empresaId, usuario_id: userId, action: 'update_profile', payload: updates }); }
    catch (err) { console.warn('profile_audit insert failed', err); }

    // Revalidate
    const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET;
    let revalidated = false;
    if (REVALIDATE_SECRET) {
      try {
        const resp = await fetch(`${APP_ORIGIN}/api/revalidate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-revalidate-secret': REVALIDATE_SECRET },
          body: JSON.stringify({ path: `/profile/${userId}` })
        });
        if (resp.ok) revalidated = true;
      } catch (err) {
        console.error('revalidate call failed', err);
      }
    }

    return NextResponse.json({ ok: true, updated: true, table: finalResult.table, profile: finalResult.data, revalidated }, { status: 200 });
  } catch (err: any) {
    console.error('Unhandled error in admin/users/update', err);
    return NextResponse.json({ ok: false, error: String(err.message || err) }, { status: 500 });
  }
}
