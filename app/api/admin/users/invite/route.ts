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

    if (!email) return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 });
    if (!['admin','gestor','externo'].includes(papel))
      return NextResponse.json({ error: 'Papel inválido' }, { status: 400 });

    const empresa_id = process.env.CONF_EMPRESA_ID || null;
    if (!empresa_id) return NextResponse.json({ error: 'CONF_EMPRESA_ID ausente' }, { status: 500 });

    const supa = getServiceSupabase();

    // 1) Invite (idempotente)
    const { data: invited, error: invErr } = await supa.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${new URL(req.url).origin}/auth/confirm?next=/menu`,
      data: { app_role: papel, nome, nome_exibicao: nome || null },
    });
    if (invErr && !invErr.message.includes('already registered')) throw invErr;

    const userId = invited?.user?.id;
    if (!userId) {
      // Sem user_id ainda (usuário antigo). Mesmo assim retorna 202 (email foi enviado)
      return NextResponse.json({ ok: true, info: 'invite enviado' }, { status: 202 });
    }

    // 2) Upsert em profiles (Service Role ignora RLS)
    const { error: upErr } = await supa
      .from('profiles')
      .upsert({
        user_id: userId,
        empresa_id,
        papel,
        nome: nome || null,
        nome_exibicao: nome || null,
      }, { onConflict: 'user_id' });

    if (upErr) throw upErr;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'erro' }, { status: 500 });
  }
}
