// app/api/admin/users/invite/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

/**
 * POST /api/admin/users/invite
 * body: { email: string, nome?: string, papel: 'admin'|'gestor'|'externo', empresa_id?: string }
 */
export async function POST(req: Request) {
  try {
    const { email, nome, papel, empresa_id } = await req.json();

    if (!email || !papel) {
      return NextResponse.json(
        { ok: false, error: 'email e papel são obrigatórios' },
        { status: 400 }
      );
    }

    const admin = getServiceSupabase();
    const origin = new URL(req.url).origin;
    const redirectTo = `${origin}/auth/confirm?next=/menu`;

    // 1) Envia convite (sem password) e cria o utilizador pendente no Auth
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
      email,
      { redirectTo }
    );
    if (inviteErr) throw inviteErr;

    const userId = invited?.user?.id;
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: 'Convite enviado mas não recebi o user.id' },
        { status: 500 }
      );
    }

    // 2) Atualiza metadata do utilizador (papel, nome, empresa)
    const { error: metaErr } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: {
        app_role: papel,
        nome_exibicao: nome || null,
        nome: nome || null,
        empresa_id: empresa_id || null,
      },
    });
    if (metaErr) throw metaErr;

    // 3) Garante linha em profiles (idempotente)
    const upsertPayload: any = {
      user_id: userId,
      papel,
      nome: nome || null,
      nome_exibicao: nome || null,
    };
    if (empresa_id) upsertPayload.empresa_id = empresa_id;

    const { error: profErr } = await admin
      .from('profiles')
      .upsert(upsertPayload, { onConflict: 'user_id' });
    if (profErr) throw profErr;

    return NextResponse.json({ ok: true, user_id: userId });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
