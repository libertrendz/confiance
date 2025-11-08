// app/api/admin/users/invite/route.ts
import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const supa = getServerSupabase({ req });

    const body = await req.json().catch(() => ({}));
    const email: string = (body.email || '').trim().toLowerCase();
    const nome: string = (body.nome || '').trim();
    const papel: 'admin' | 'gestor' | 'externo' = body.papel || 'externo';

    if (!email) return NextResponse.json({ error: 'email_required' }, { status: 400 });

    // Quem está convidando
    const { data: me, error: meErr } = await supa.auth.getUser();
    if (meErr || !me?.user) return NextResponse.json({ error: 'no_session' }, { status: 401 });

    // Empresa do convidador
    const { data: myProf, error: profErr } = await supa
      .from('profiles')
      .select('empresa_id')
      .eq('user_id', me.user.id)
      .maybeSingle();
    if (profErr) throw profErr;

    const empresa_id = myProf?.empresa_id || null;

    // Cria o utilizador via signUp com redirect para /auth/confirm
    const redirectTo = `${new URL(req.url).origin}/auth/confirm?next=/menu`;
    const { data: sign, error: signErr } = await supa.auth.signUp({
      email,
      options: {
        emailRedirectTo: redirectTo,
        data: { app_role: papel, nome, nome_exibicao: nome || null },
      },
    });
    if (signErr) return NextResponse.json({ error: 'auth_signup_failed', detail: signErr.message }, { status: 400 });

    const newUserId = sign.user?.id;
    if (!newUserId) {
      return NextResponse.json({ error: 'missing_user_id_after_signup' }, { status: 500 });
    }

    // Garante profile (idempotente por user_id)
    const { error: upsertErr } = await supa.from('profiles').upsert(
      {
        user_id: newUserId,
        empresa_id,
        papel,
        nome,
        nome_exibicao: nome || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
    if (upsertErr) {
      return NextResponse.json({ error: 'db_profile_upsert_failed', detail: upsertErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, user_id: newUserId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'fail' }, { status: 500 });
  }
}
