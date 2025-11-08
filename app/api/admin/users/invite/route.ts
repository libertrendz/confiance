// app/api/admin/users/invite/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const { email, nome, papel } = await req.json();
    if (!email || !papel) {
      return NextResponse.json({ ok: false, error: 'missing_email_or_role' }, { status: 400 });
    }
    if (!['admin','gestor','externo'].includes(papel)) {
      return NextResponse.json({ ok: false, error: 'invalid_role' }, { status: 400 });
    }

    const admin = getServiceSupabase();
    const empresa_id = process.env.CONF_EMPRESA_ID;
    if (!empresa_id) throw new Error('CONF_EMPRESA_ID ausente');

    // 1) Dispara convite oficial do Auth
    const { data: invited, error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `/auth/confirm?next=/menu`,
      data: {
        app_role: papel,
        nome_exibicao: nome || '',
        nome: nome || '',
      },
    });
    if (invErr) throw invErr;

    const user_id = invited?.user?.id;
    if (!user_id) throw new Error('invite_ok_but_no_user_id');

    // 2) Upsert no profiles (bypass RLS via service role)
    const { error: upErr } = await admin.from('profiles').upsert({
      user_id,
      empresa_id,
      papel,
      nome_exibicao: nome || null,
      nome: nome || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (upErr) throw upErr;

    return NextResponse.json({ ok: true, user_id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'invite_failed' }, { status: 500 });
  }
}
