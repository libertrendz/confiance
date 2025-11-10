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

    if (!email)
      return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 });

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

    const userId = invited?.user?.id || null;

    // 2) Upsert em profiles
    if (userId) {
      const payload: any = {
        user_id: userId,
        empresa_id,
        papel,
        nome,
        nome_exibicao: nome || null,
      };

      const { error: upErr } = await supa
        .from('profiles')
        .upsert(payload, { onConflict: 'user_id' });

      if (upErr) throw upErr;
    }

    return NextResponse.json({ ok: true, user_id: userId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro ao salvar utilizador' }, { status: 500 });
  }
}
