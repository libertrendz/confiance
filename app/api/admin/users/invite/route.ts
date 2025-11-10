// app/api/admin/users/invite/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

type Papel = 'admin' | 'gestor' | 'externo';

export async function POST(req: Request) {
  try {
    const supa = getServiceSupabase(); // service-role: bypass RLS

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || '').trim().toLowerCase();
    const nome = String(body?.nome || '').trim();
    const papel = (String(body?.papel || 'externo') as Papel);
    const empresa_id = process.env.CONF_EMPRESA_ID || null;

    if (!email) return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 });
    if (!['admin','gestor','externo'].includes(papel)) return NextResponse.json({ error: 'Papel inválido' }, { status: 400 });

    const redirectTo = `${new URL(req.url).origin}/auth/confirm?next=/menu`;

    // 1) Envia convite; se já estiver registado, ignora erro e prossegue
    const { data: invited, error: invErr } = await supa.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { app_role: papel, nome, nome_exibicao: nome || null },
    });
    if (invErr && !invErr.message?.includes('already registered')) {
      return NextResponse.json({ error: invErr.message || 'invite_failed' }, { status: 500 });
    }

    // Recupera/descobre user_id de qualquer forma
    const userId = invited?.user?.id || (await (async () => {
      const { data: u, error: ue } = await supa.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (ue) return null;
      return u.users.find(x => x.email?.toLowerCase() === email)?.id || null;
    })());

    if (!userId) {
      // convite enviado, mas o provedor ainda não devolveu o user — aceitável
      return NextResponse.json({ ok: true, info: 'invited_without_user_id' }, { status: 202 });
    }

    // 2) Upsert em profiles (idempotente)
    const payload: any = {
      user_id: userId,
      papel,
      nome: nome || null,
      nome_exibicao: nome || null,
    };
    if (empresa_id) payload.empresa_id = empresa_id;

    const { error: upErr } = await supa
      .from('profiles')
      .upsert(payload, { onConflict: 'user_id', ignoreDuplicates: false })
      .select('user_id')
      .single();

    if (upErr) {
      return NextResponse.json({ error: upErr.message || 'profiles_upsert_failed' }, { status: 500 });
    }

    // 3) Ajusta metadata (garante app_role/nome)
    await supa.auth.admin.updateUserById(userId, {
      user_metadata: { app_role: papel, nome, nome_exibicao: nome || null },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'invite_failed' }, { status: 500 });
  }
}
