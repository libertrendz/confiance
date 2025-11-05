// app/api/admin/users/create/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAdminSupabase } from '@/lib/supabaseAdmin';

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SITE = process.env.NEXT_PUBLIC_SITE_URL || '';

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
    const empresaId = (caller.user_metadata?.empresa_id as string) || null;
    if (callerRole !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    if (!empresaId) return NextResponse.json({ error: 'missing_empresa_id' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const nome  = String(body.nome || 'Utilizador');
    const papel = String(body.papel || 'externo') as 'externo'|'gestor'|'admin';
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
    }

    const admin = getAdminSupabase();

    const inv = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${SITE}/login`,
    });
    if (inv.error) {
      return NextResponse.json(
        { error: 'invite_failed', details: inv.error.message },
        { status: 400 },
      );
    }

    const uid = inv.data.user.id;

    const upm = await admin.auth.admin.updateUserById(uid, {
      user_metadata: { app_role: papel, empresa_id: empresaId },
    });
    if (upm.error) {
      return NextResponse.json(
        { error: 'metadata_failed', details: upm.error.message },
        { status: 400 },
      );
    }

    const up = await admin
      .from('profiles')
      .upsert({ user_id: uid, empresa_id: empresaId, nome, papel }, { onConflict: 'user_id' });
    if (up.error) {
      return NextResponse.json(
        { error: 'profiles_failed', details: up.error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true, user_id: uid });
  } catch (e: any) {
    return NextResponse.json({ error: 'unexpected', details: e?.message }, { status: 500 });
  }
}
