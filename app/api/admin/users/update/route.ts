// app/api/admin/users/update/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL ?? 'https://erp-confiance.vercel.app';

function getSupabaseClient() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    console.error('Missing SUPABASE envs');
    return null;
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  try {
    const API_ADMIN_SECRET = process.env.API_ADMIN_SECRET;
    const provided = req.headers.get('x-admin-secret');
    if (!API_ADMIN_SECRET) {
      console.error('API_ADMIN_SECRET missing in env');
      return NextResponse.json({ ok: false, error: 'Server misconfigured' }, { status: 500 });
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

    // sanitize
    delete updates.id;
    updates.empresa_id = empresaId;

    const supabase = getSupabaseClient();
    if (!supabase) return NextResponse.json({ ok: false, error: 'DB client error' }, { status: 500 });

    // Try update by user_id
    const updByUser = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', userId)
      .eq('empresa_id', empresaId)
      .select('*');

    if (updByUser.error) {
      console.error('update by user_id error', updByUser.error);
      // proceed to check by id as fallback
    } else if (updByUser.data && Array.isArray(updByUser.data) && updByUser.data.length === 1) {
      const profile = updByUser.data[0];

      // audit (fire-and-forget using async IIFE with try/await)
      (async () => {
        try {
          await supabase.from('profile_audit').insert({
            empresa_id: empresaId,
            usuario_id: userId,
            action: 'update_profile',
            payload: updates
          });
        } catch (e) {
          console.warn('profile_audit insert failed', e);
        }
      })();

      // revalidate (best-effort)
      (async () => {
        try {
          const secret = process.env.REVALIDATE_SECRET;
          if (secret) {
            await fetch(`${APP_ORIGIN}/api/revalidate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-revalidate-secret': secret },
              body: JSON.stringify({ path: `/profile/${userId}` })
            });
          }
        } catch (e) {
          console.warn('revalidate failed', e);
        }
      })();

      return NextResponse.json({ ok: true, updated: true, by: 'user_id', profile }, { status: 200 });
    }

    // fallback: try update by id
    const updById = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .eq('empresa_id', empresaId)
      .select('*');

    if (updById.error) {
      console.error('update by id error', updById.error);
      return NextResponse.json({ ok: false, error: 'DB update error', detail: updById.error }, { status: 500 });
    }

    if (updById.data && Array.isArray(updById.data) && updById.data.length === 1) {
      const profile = updById.data[0];

      (async () => {
        try {
          await supabase.from('profile_audit').insert({
            empresa_id: empresaId,
            usuario_id: userId,
            action: 'update_profile',
            payload: updates
          });
        } catch (e) {
          console.warn('profile_audit insert failed', e);
        }
      })();

      (async () => {
        try {
          const secret = process.env.REVALIDATE_SECRET;
          if (secret) {
            await fetch(`${APP_ORIGIN}/api/revalidate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-revalidate-secret': secret },
              body: JSON.stringify({ path: `/profile/${userId}` })
            });
          }
        } catch (e) {
          console.warn('revalidate failed', e);
        }
      })();

      return NextResponse.json({ ok: true, updated: true, by: 'id', profile }, { status: 200 });
    }

    // No rows updated
    return NextResponse.json({ ok: false, error: 'No rows updated', detail: { table: 'profiles' } }, { status: 404 });
  } catch (err: any) {
    console.error('Unhandled in admin/users/update', err);
    return NextResponse.json({ ok: false, error: String(err.message || err) }, { status: 500 });
  }
}