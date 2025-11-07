// app/api/admin/users/invite/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type Papel = 'admin' | 'gestor' | 'externo';

export async function POST(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return NextResponse.json(
        { ok: false, error: 'Missing SUPABASE envs (URL or SERVICE_ROLE_KEY)' },
        { status: 500 }
      );
    }

    const admin = createClient(url, serviceKey);

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || '').trim().toLowerCase();
    const nome = String(body?.nome || '').trim();
    const papel = (String(body?.papel || 'externo').trim() as Papel);
    const empresa_id = String(body?.empresa_id || '').trim(); // opcional; se vier, gravamos

    if (!email) {
      return NextResponse.json({ ok: false, error: 'Email obrigatório' }, { status: 400 });
    }
    if (!['admin', 'gestor', 'externo'].includes(papel)) {
      return NextResponse.json({ ok: false, error: 'Papel inválido' }, { status: 400 });
    }

    // Redireciona para o confirm
    const origin = new URL(req.url).origin;
    const redirectTo = `${origin}/auth/confirm?next=/menu`;

    // 1) Convida o utilizador (cria user e envia email)
    const { data: invite, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: {
        app_role: papel,
        nome_exibicao: nome || null,
        ...(empresa_id ? { empresa_id } : {}),
      },
    });
    if (inviteErr) {
      return NextResponse.json({ ok: false, error: inviteErr.message }, { status: 400 });
    }

    const user = invite?.user;
    if (!user?.id) {
      // Muito improvável, mas sejamos explícitos
      return NextResponse.json({ ok: false, error: 'Convite enviado, mas user vazio' }, { status: 200 });
    }

    // 2) Upsert do profile para refletir no app imediatamente
    // Tabela profiles: user_id, empresa_id, papel, nome, created_at, updated_at, id, nome_exibicao
    const upsertPayload: Record<string, any> = {
      user_id: user.id,
      papel,
      nome: nome || null,
      nome_exibicao: nome || null,
    };
    if (empresa_id) upsertPayload.empresa_id = empresa_id;

    const { error: upErr } = await admin.from('profiles').upsert(upsertPayload, {
      onConflict: 'user_id',
      ignoreDuplicates: false,
    });
    if (upErr) {
      // Não falha o convite por causa do perfil; só reporta
      return NextResponse.json({
        ok: true,
        warning: `Convite enviado, mas falhou sincronizar profiles: ${upErr.message}`,
        user_id: user.id,
        email,
        papel,
      });
    }

    return NextResponse.json({
      ok: true,
      user_id: user.id,
      email,
      papel,
      redirectTo,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Erro inesperado' }, { status: 500 });
  }
}
