// app/api/admin/users/invite/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

type Papel = 'admin' | 'gestor' | 'externo';

export async function POST(req: Request) {
  try {
    const admin = getServiceSupabase();
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? '').trim().toLowerCase();
    const nome = String(body.nome ?? '').trim();
    const papel: Papel = (body.papel as Papel) ?? 'externo';

    if (!email) {
      return NextResponse.json({ ok: false, error: 'missing_email' }, { status: 400 });
    }

    // 1) Convida via Admin API (não pede password)
    const { data: invited, error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${new URL(req.url).origin}/auth/confirm?next=/menu`,
    });
    if (invErr) throw invErr;

    const userId = invited?.user?.id;
    if (!userId) throw new Error('invite_without_user_id');

    // 2) Grava/atualiza profiles
    //    Nota: garante que empresa_id default está definido por trigger ou aqui ajusta conforme teu multi-tenant
    const { error: upsertErr } = await admin.from('profiles').upsert(
      {
        user_id: userId,
        papel,
        nome,
        nome_exibicao: nome || email.split('@')[0],
      },
      { onConflict: 'user_id' }
    );
    if (upsertErr) throw upsertErr;

    // 3) Atualiza metadata no Auth (app_role, nome/nome_exibicao)
    const { error: metaErr } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: {
        app_role: papel,
        nome,
        nome_exibicao: nome || email.split('@')[0],
      },
    });
    if (metaErr) throw metaErr;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'invite_failed' },
      { status: 500 }
    );
  }
}
