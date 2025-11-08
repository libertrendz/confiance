// app/api/admin/users/update/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

type Papel = 'admin' | 'gestor' | 'externo';

export async function POST(req: Request) {
  try {
    const admin = getServiceSupabase();
    const body = await req.json().catch(() => ({}));

    const user_id = String(body.user_id ?? '').trim();
    const nome = String(body.nome ?? '').trim();
    const nome_exibicao = String(body.nome_exibicao ?? '').trim();
    const papel: Papel = (body.papel as Papel) ?? 'externo';

    if (!user_id) {
      return NextResponse.json({ ok: false, error: 'missing_user_id' }, { status: 400 });
    }

    // 1) Atualiza profiles
    const { error: pErr } = await admin.from('profiles').update({
      nome,
      nome_exibicao: nome_exibicao || nome || undefined,
      papel,
      updated_at: new Date().toISOString(),
    }).eq('user_id', user_id);
    if (pErr) throw pErr;

    // 2) Atualiza metadata do Auth
    const { error: mErr } = await admin.auth.admin.updateUserById(user_id, {
      user_metadata: {
        app_role: papel,
        nome,
        nome_exibicao: nome_exibicao || nome || undefined,
      },
    });
    if (mErr) throw mErr;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'update_failed' },
      { status: 500 }
    );
  }
}
