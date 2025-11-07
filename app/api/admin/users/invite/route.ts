// app/api/admin/users/invite/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email: string = String(body.email || '').trim().toLowerCase();
    const papel: 'admin' | 'gestor' | 'externo' = (body.papel || 'externo').toLowerCase();
    const empresa_id: string = String(body.empresa_id || '').trim();
    const nome: string | null = body.nome ? String(body.nome) : null;
    const nome_exibicao: string | null = body.nome_exibicao ? String(body.nome_exibicao) : null;

    if (!email) return NextResponse.json({ error: 'email obrigatório' }, { status: 400 });
    if (!empresa_id) return NextResponse.json({ error: 'empresa_id obrigatório' }, { status: 400 });
    if (!['admin','gestor','externo'].includes(papel))
      return NextResponse.json({ error: 'papel inválido' }, { status: 400 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!url || !service) {
      return NextResponse.json({ error: 'Faltam envs do Supabase (URL/Service Key)' }, { status: 500 });
    }

    // Admin client
    const admin = createClient(url, service, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // 1) Cria user e envia email de convite
    const redirectTo = `${new URL(req.url).origin}/auth/confirm?next=/menu`;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: { app_role: papel, nome: nome ?? nome_exibicao ?? '' },
      app_metadata: { provider: 'email' },
      // Não há "invite" separado na SDK v2; para forçar email de confirmação, usa generateLink:
    });
    if (createErr) {
      // Se já existe, pega o user existente
      if (createErr.status !== 422) {
        return NextResponse.json({ error: createErr.message }, { status: 400 });
      }
    }

    // Gera link de confirmação (equivalente a convite)
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'signup',
      email,
      options: { redirectTo }
    });
    if (linkErr) {
      return NextResponse.json({ error: linkErr.message }, { status: 400 });
    }

    const user_id = linkData?.user?.id;
    if (!user_id) {
      return NextResponse.json({ error: 'Não foi possível obter user_id' }, { status: 400 });
    }

    // 2) Upsert do profile via RPC
    const { error: rpcErr } = await admin.rpc('perfil_upsert_admin', {
      p_user_id: user_id,
      p_empresa_id: empresa_id,
      p_papel: papel,
      p_nome: nome,
      p_nome_exibicao: nome_exibicao
    });
    if (rpcErr) {
      return NextResponse.json({ error: rpcErr.message }, { status: 400 });
    }

    // 3) Retorna OK
    return NextResponse.json({
      ok: true,
      user_id,
      email,
      next: redirectTo
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'erro inesperado' }, { status: 500 });
  }
}
