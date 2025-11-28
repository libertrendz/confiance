// app/api/admin/users/update/route.ts
// Versão segura: lazy-init do Supabase client para evitar crash no build

import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL || 'https://erp-confiance.vercel.app';

function makeSupabaseClient(): { client?: SupabaseClient; missing?: string[] } {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const missing: string[] = [];
  if (!SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');

  if (missing.length) return { missing };

  const client = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
  });
  return { client };
}

export async function POST(req: Request) {
  try {
    // Auth header check
    const provided = req.headers.get('x-admin-secret');
    const API_ADMIN_SECRET = process.env.API_ADMIN_SECRET;
    if (!API_ADMIN_SECRET) {
      console.error('API_ADMIN_SECRET missing in env');
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

    // lazy create supabase client (avoids build-time evaluation)
    const { client, missing } = makeSupabaseClient();
    if (missing && missing.length) {
      console.error('Missing env:', missing);
      return NextResponse.json({ ok: false, error: `Missing env: ${missing.join(', ')}` }, { status: 500 });
    }
    if (!client) {
      return NextResponse.json({ ok: false, error: 'Could not initialize DB client' }, { status: 500 });
    }

    // Proteções e update
    delete updates.id;
    updates.empresa_id = empresaId;

    const { data: updatedProfile, error: updateErr } = await client
      .from('profile')
      .update(updates)
      .eq('id', userId)
      .eq('empresa_id', empresaId)
      .select('*')
      .single();

    if (updateErr) {
      console.error('supabase update error', updateErr);
      return NextResponse.json({ ok: false, error: 'DB update error: ' + (updateErr.message ?? updateErr) }, { status: 500 });
    }

    // Try insert audit (non-blocking)
    try {
      await client.from('profile_audit').insert({
        empresa_id: empresaId,
        usuario_id: userId,
        action: 'update_profile',
        payload: updates
      });
    } catch (auditErr) {
      console.warn('profile_audit insert failed', auditErr);
    }

    // Revalidate via internal endpoint (uses REVALIDATE_SECRET)
    const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET;
    let revalidated = false;
    if (REVALIDATE_SECRET) {
      try {
        const resp = await fetch(`${APP_ORIGIN}/api/revalidate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-revalidate-secret': REVALIDATE_SECRET
          },
          body: JSON.stringify({ path: `/profile/${userId}` })
        });
        if (resp.ok) revalidated = true;
        else {
          const txt = await resp.text().catch(() => 'no-body');
          console.warn('revalidate returned not OK', resp.status, txt);
        }
      } catch (err) {
        console.error('revalidate call failed', err);
      }
    } else {
      console.warn('REVALIDATE_SECRET not set; skipping revalidate call');
    }

    return NextResponse.json({ ok: true, updated: true, revalidated, profile: updatedProfile }, { status: 200 });
  } catch (err: any) {
    console.error('Unhandled error in admin/users/update', err);
    return NextResponse.json({ ok: false, error: String(err.message || err) }, { status: 500 });
  }
}
