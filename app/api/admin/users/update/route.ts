// app/api/admin/users/update/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAdminSupabase } from '@/lib/supabaseAdmin';

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function getCaller(token: string) {
  const supa = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supa.auth.getUser(token);
  if (error) throw error;
  return data.user;
}

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return NextResponse.json({ error: 'missing_token' }, { status: 401 });

    const caller = await getCaller(token);
    const callerRole = (caller.user_metadata?.app_role as string) || 'externo';
    if (callerRole !== 'admin' && callerRole !== 'gestor') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const userId = String(body.user_id || '');
    const nome   = String(body.nome || '');
    const papel  = String(body.papel || 'externo') as 'externo'|'gestor'|'admin';

    const admin = getAdminSupabase();

    const up = await admin.from('profiles').update({ nome, papel }).eq('user_id', userId);
    if (up.error) {
      return NextResponse.json(
        { error: 'profiles_failed', details: up.error.message },
        { status: 400 },
      );
    }

    const um = await admin.auth.admin.updateUserById(userId, {
      user_metadata: { app_role: papel },
    });
    if (um.error) {
      return NextResponse.json(
        { error: 'metadata_failed', details: um.error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: 'unexpected', details: e?.message }, { status: 500 });
  }
}
