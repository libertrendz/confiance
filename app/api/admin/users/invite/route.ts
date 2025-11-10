// app/api/admin/users/invite/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

type Papel = 'admin' | 'gestor' | 'externo';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || '').trim().toLowerCase();
    const nome = String(body?.nome || '').trim();
    const papel = (String(body?.papel || 'externo') as Papel);
    const empresa_id = process.env.CONF_EMPRESA_ID || null;

    if (!email) return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 });
    if (!['admin','gestor','externo'].includes(papel))
      return NextResponse.json({ error: 'Papel inválido' }, { status: 400 });

    const supa = getServiceSupabase();
    const redirectTo = `${new URL(req.url).origin}/auth/confirm?next=/menu`;

    // 1) Convida (se já existir, ignora erro e segue)
    const { data: invited, error: invErr } = await supa.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { app_role: papel, nome, nome_exibicao: nome || null },
    });

    let userId = invited?.user?.id ?? null;

    if (invErr) {
      const msg = invErr.message?.toLowerCase() || '';
      if (!msg.includes('already registered') && !msg.includes('already exists')) {
        return NextResponse.json({ error: `Invite falhou: ${invErr.message}` }, { status: 400 });
      }
      // Já existe: procurar ID pelo email
      const { data: list } = await supa.auth.admin.listUsers({ page: 1, perPage: 200 });
      userId = list?.users?.find(u => u.email?.toLowerCase() === email)?.id || null;
      if (!userId) {
        return NextResponse.json({ error: 'Utilizador já existe mas não foi possível obter o ID.' }, { status: 400 });
      }
    }

    if (!userId) {
      // convite enviado mas o utilizador ainda não confirmou; não há ID ainda
      return NextResponse.json({ ok: true, status: 'invited' });
    }

    // 2) Upsert em profiles (RLS ok para service role)
    const payload: any = {
      user_id: userId,
      papel,
      nome: nome || null,
      nome_exibicao: nome || null,
    };
    if (empresa_id) payload.empresa_id = empresa_id;

    const { error: upErr } = await supa
      .from('profiles')
      .upsert(payload, { onConflict: 'user_id' });

    if (upErr) {
      return NextResponse.json({ error: `Falha ao gravar profile: ${upErr.message}` }, { status: 400 });
    }

    // 3) Reflete metadata coerente
    await supa.auth.admin.updateUserById(userId, {
      user_metadata: { app_role: papel, nome, nome_exibicao: nome || null },
    });

    return NextResponse.json({ ok: true, status: 'invited_or_updated', user_id: userId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro inesperado' }, { status: 500 });
  }
}
