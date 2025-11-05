// app/api/admin/users/create/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAdminSupabase } from '@/lib/supabaseAdmin';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// util: obter utilizador chamador a partir do token
async function getCallerUser(accessToken: string) {
  const supa = createClient(URL, ANON, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data, error } = await supa.auth.getUser(accessToken);
  if (error) throw error;
  return data.user;
}

export async function POST(req: Request) {
  try {
    // 1) validar token do chamador
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return NextResponse.json({ error: 'missing_token' }, { status: 401 });

    const caller = await getCallerUser(token);
    if (!caller) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

    // 2) validar papel = admin
    const meta = (caller.user_metadata || {}) as Record<string, any>;
    const callerRole = (meta.app_role as string) || 'colaborador';
    const empresaId = (meta.empresa_id as string) || null;
    if (callerRole !== 'admin') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    if (!empresaId) {
      return NextResponse.json({ error: 'missing_empresa_id' }, { status: 400 });
    }

    // 3) ler payload
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const nome  = String(body.nome || 'Colaborador');
    const papel = (String(body.papel || 'colaborador') as 'colaborador'|'gestor'|'admin');

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
    }

    const admin = getAdminSupabase();

    // 4) mandar convite por email
    // redirect após aceitar: /login (poderia ser /auth/confirm também)
    const { data: invited, error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/login`
    });
    if (invErr) {
      return NextResponse.json({ error: 'invite_failed', details: invErr.message }, { status: 400 });
    }
    const newUser = invited.user;

    // 5) setar metadata (papel + empresa)
    const { error: updErr } = await admin.auth.admin.updateUserById(newUser.id, {
      user_metadata: { app_role: papel, empresa_id: empresaId }
    });
    if (updErr) {
      return NextResponse.json({ error: 'metadata_failed', details: updErr.message }, { status: 400 });
    }

    // 6) profiles
    const { error: profErr } = await admin
      .from('profiles')
      .upsert({
        user_id: newUser.id,
        empresa_id: empresaId,
        papel,
        nome
      }, { onConflict: 'user_id' });
    if (profErr) {
      return NextResponse.json({ error: 'profiles_failed', details: profErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, user_id: newUser.id });
  } catch (e: any) {
    return NextResponse.json({ error: 'unexpected', details: e?.message || String(e) }, { status: 500 });
  }
}
