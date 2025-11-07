import { NextResponse } from 'next/server';
import { getAdminClient } from '../../_supabase';

export async function POST(req: Request) {
  try {
    const { email, nome, papel = 'externo' } = await req.json();

    if (!email) throw new Error('Email obrigatório');

    const supa = getAdminClient();

    // 1) Cria o user (se já existir, segue)
    const { data: created, error: cErr } = await supa.auth.admin.createUser({
      email,
      email_confirm: false, // vamos enviar convite abaixo
    });
    if (cErr && cErr.message?.includes('already registered') === false) throw cErr;

    const userId = created?.user?.id ?? (
      // pega id do usuário que já existia
      (await supa.auth.admin.listUsers()).data?.users?.find(u => u.email === email)?.id
    );
    if (!userId) throw new Error('Falha ao obter id do utilizador');

    // 2) Garante row em profiles
    const { error: upErr } = await supa
      .from('profiles')
      .upsert(
        { user_id: userId, nome_exibicao: nome ?? null, papel },
        { onConflict: 'user_id' }
      );
    if (upErr) throw upErr;

    // 3) Envia link mágico de confirmação
    const { error: invErr } = await supa.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/auth/confirm?next=/menu`
    });
    if (invErr) throw invErr;

    return NextResponse.json({ ok: true, user_id: userId });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'fail' }, { status: 500 });
  }
}
