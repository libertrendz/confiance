// app/api/admin/users/invite/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

type Papel = 'admin' | 'gestor' | 'externo';

export async function POST(req: Request) {
  const supa = getServiceSupabase();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
  }

  const rawEmail = String(body?.email || '').trim();
  const email = rawEmail.toLowerCase();
  const nome = String(body?.nome || '').trim();
  const papel = (String(body?.papel || 'externo') as Papel);
  const empresa_id = process.env.CONF_EMPRESA_ID || null;

  if (!email) {
    return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 });
  }
  if (!['admin', 'gestor', 'externo'].includes(papel)) {
    return NextResponse.json({ error: 'Papel inválido' }, { status: 400 });
  }
  if (!empresa_id) {
    return NextResponse.json(
      { error: 'CONF_EMPRESA_ID em falta no servidor' },
      { status: 500 },
    );
  }

  const url = new URL(req.url);
  const redirectTo = `${url.origin}/auth/confirm?next=/menu`;

  let userId: string | null = null;

  // 1) Tenta enviar convite
  const { data: invited, error: invErr } =
    await supa.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { app_role: papel, nome, nome_exibicao: nome || null },
    });

  if (invErr) {
    // Se não for o clássico "already registered", falha direto
    if (!invErr.message?.toLowerCase().includes('already registered')) {
      return NextResponse.json(
        { error: `Invite falhou: ${invErr.message}` },
        { status: 400 },
      );
    }
  }

  userId = invited?.user?.id ?? null;

  // 2) Se já estava registado, tentamos obter o id via listUsers
  if (!userId) {
    const { data: lu, error: le } = await supa.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (le) {
      return NextResponse.json(
        { error: `Lookup falhou: ${le.message}` },
        { status: 400 },
      );
    }

    const list = ((lu as any)?.users ?? []) as any[];
    const found = list.find(
      (u) =>
        (u.email as string | null | undefined)?.toLowerCase() === email,
    );
    userId = found?.id ?? null;
  }

  // Se mesmo assim não achou, pelo menos o convite foi enviado
  if (!userId) {
    return NextResponse.json(
      {
        ok: false,
        warning:
          'Convite enviado, mas não foi possível associar o utilizador em profiles.',
      },
      { status: 202 },
    );
  }

  // 3) Upsert em profiles
  const payload = {
    user_id: userId,
    empresa_id,
    papel,
    nome: nome || null,
    nome_exibicao: nome || null,
  };

  const { error: upErr } = await supa
    .from('profiles')
    .upsert(payload, { onConflict: 'user_id' });

  if (upErr) {
    return NextResponse.json(
      { error: `Erro ao guardar perfil: ${upErr.message}` },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, user_id: userId });
}
