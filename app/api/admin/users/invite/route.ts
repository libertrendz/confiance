// app/api/admin/users/invite/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

type Papel = 'admin' | 'gestor' | 'externo';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const nome  = String(body?.nome  || '').trim();
    const papel = (String(body?.papel || 'externo') as Papel);
    const empresa_id = process.env.CONF_EMPRESA_ID || null;

    if (!email) return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 });
    if (!['admin','gestor','externo'].includes(papel)) {
      return NextResponse.json({ error: 'Papel inválido' }, { status: 400 });
    }

    const redirectTo = `${new URL(req.url).origin}/auth/confirm?next=/menu`;
    const supa = getServiceSupabase();

    // 1) Envia convite. Se já existir, seguimos assim mesmo.
    const { data: invited, error: invErr } = await supa.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { app_role: papel, nome, nome_exibicao: nome || null },
    });
    if (invErr && !invErr.message?.includes('already registered')) {
      return NextResponse.json({ error: invErr.message }, { status: 500 });
    }

    // 2) Descobre/garante o user_id
    let userId = invited?.user?.id || null;
    if (!userId) {
      const lu: any = await supa.auth.admin.listUsers({ page: 1, perPage: 1000 } as any);
      const found = (lu?.data?.users || []).find((u: any) => (u.email || '').toLowerCase() === email);
      userId = found?.id || null;
    }
    if (!userId) {
      // Convite enviado mas ainda sem user criado (acontece antes da confirmação)
      return NextResponse.json({ message: 'Convite enviado', status: 'pending' }, { status: 202 });
    }

    // 3) Upsert no profiles, conflict em user_id
    const payload: any = {
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
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    // 4) Escreve metadata (fonte da verdade no JWT)
    await supa.auth.admin.updateUserById(userId, {
      user_metadata: { app_role: papel, nome, nome_exibicao: nome || null }
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro inesperado' }, { status: 500 });
  }
}
