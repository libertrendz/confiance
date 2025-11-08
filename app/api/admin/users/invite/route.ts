// app/api/admin/users/invite/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

type Papel = 'admin' | 'gestor' | 'externo';

export async function POST(req: Request) {
  try {
    const supa = getServiceSupabase();
    const body = await req.json().catch(() => ({}));

    const email = String(body?.email || '').trim().toLowerCase();
    const nome = String(body?.nome || '').trim();
    const papel = (String(body?.papel || 'externo') as Papel);
    const empresa_id = process.env.CONF_EMPRESA_ID || null;

    if (!email) return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 });
    if (!['admin', 'gestor', 'externo'].includes(papel))
      return NextResponse.json({ error: 'Papel inválido' }, { status: 400 });

    const redirectTo = `${new URL(req.url).origin}/auth/confirm?next=/menu`;

    // 1) Envia convite — se já existir, ignora e segue
    const { data: invited, error: invErr } = await supa.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { app_role: papel, nome, nome_exibicao: nome || null },
    });

    if (invErr && !invErr.message.includes('already registered')) {
      throw invErr;
    }
    const userId = invited?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Convite enviado, mas sem user_id' }, { status: 202 });
    }

    // 2) Upsert em profiles
    const empresa_id = process.env.CONF_EMPRESA_ID || null;
    const payload: any = {
      user_id: userId,
      papel,
      nome,
      nome_exibicao: nome || null,
      ...(empresa_id ? { empresa_id } : {}),
    };

    const { error: upErr } = await supa.from('profiles').upsert(payload, { onConflict: 'user_id' });
    if (upErr) {
      // Não bloqueia convite; apenas reporta
      return NextResponse.json({
        warning: `Convite OK, mas falhou salvar em profiles: ${upErr.message}`,
        user_id: userId,
      }, { status: 202 });
    }

    return NextResponse.json({ ok: true, user_id: userId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro desconhecido' }, { status: 500 });
  }
}
