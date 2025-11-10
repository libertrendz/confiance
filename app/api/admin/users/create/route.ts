// app/api/admin/users/create/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

type Papel = 'admin' | 'gestor' | 'externo';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const nome = String(body?.nome || '').trim();
    const papel = (String(body?.papel || 'externo') as Papel);
    const empresa_id = process.env.CONF_EMPRESA_ID || null;

    if (!email) return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 });
    if (!['admin', 'gestor', 'externo'].includes(papel))
      return NextResponse.json({ error: 'Papel inválido' }, { status: 400 });

    const supa = getServiceSupabase();
    const redirectTo = `${new URL(req.url).origin}/auth/confirm?next=/menu`;

    // 1) Envia convite (idempotente). Se já existir, segue o fluxo igual.
    const { data: invited, error: invErr } = await supa.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { app_role: papel, nome, nome_exibicao: nome || null },
    });
    if (invErr && !invErr.message.includes('already registered')) {
      return NextResponse.json({ error: invErr.message }, { status: 500 });
    }

    // 2) Descobre o user_id (do convite ou consultando auth.users)
    let userId = invited?.user?.id || null;
    if (!userId) {
      const { data: authUser, error: findErr } = await supa
        .schema('auth')
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      if (findErr) return NextResponse.json({ error: findErr.message }, { status: 500 });
      userId = authUser?.id || null;
    }
    if (!userId) {
      // Convite foi enviado mas ainda sem criação do registo em auth.users
      return NextResponse.json(
        { ok: true, info: 'Convite enviado. O perfil será criado após confirmação do email.' },
        { status: 202 }
      );
    }

    // 3) Upsert em profiles (idempotente)
    const payload: any = {
      user_id: userId,
      papel,
      nome: nome || null,
      nome_exibicao: nome || null,
      updated_at: new Date().toISOString(),
    };
    if (empresa_id) payload.empresa_id = empresa_id;

    const { error: upErr } = await supa
      .from('profiles')
      .upsert(payload, { onConflict: 'user_id' });

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Falha ao criar utilizador' }, { status: 500 });
  }
}
