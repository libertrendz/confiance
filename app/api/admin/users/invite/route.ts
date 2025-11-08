// app/api/admin/users/invite/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

type Papel = 'admin' | 'gestor' | 'externo';

export async function POST(req: Request) {
  try {
    const { email, nome, papel, empresa_id } = (await req.json()) as {
      email: string; nome?: string; papel: Papel; empresa_id?: string | null;
    };

    if (!email || !papel) {
      return NextResponse.json({ ok: false, error: 'email e papel são obrigatórios' }, { status: 400 });
    }

    const admin = getServiceSupabase();
    const origin = new URL(req.url).origin;
    const redirectTo = `${origin}/auth/confirm?next=/menu`;

    // 1) Convida e cria utilizador pendente
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
    if (inviteErr) throw inviteErr;

    const userId = invited?.user?.id;
    if (!userId) throw new Error('Convite enviado, mas sem user.id de retorno');

    // 2) Metadata
    const { error: metaErr } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: {
        app_role: papel,
        nome_exibicao: nome || null,
        nome: nome || null,
        empresa_id: empresa_id || null,
      },
    });
    if (metaErr) throw metaErr;

    // 3) Profiles upsert idempotente (service role ignora RLS)
    const upsertPayload: any = {
      user_id: userId,
      papel,
      nome: nome || null,
      nome_exibicao: nome || null,
    };
    if (empresa_id) upsertPayload.empresa_id = empresa_id;

    const { error: profErr } = await admin.from('profiles').upsert(upsertPayload, { onConflict: 'user_id' });
    if (profErr) throw profErr;

    return NextResponse.json({ ok: true, user_id: userId });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
