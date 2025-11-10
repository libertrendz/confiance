// app/api/admin/users/update/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

type Papel = 'admin' | 'gestor' | 'externo';

export async function POST(req: Request) {
  try {
    const supa = getServiceSupabase();

    const body = await req.json().catch(() => ({}));
    const user_id = String(body?.user_id || body?.id || '');
    const nome = (body?.nome ?? null) as string | null;
    const papel = (body?.papel ?? null) as Papel | null;

    if (!user_id) return NextResponse.json({ error: 'user_id obrigatório' }, { status: 400 });
    if (papel && !['admin','gestor','externo'].includes(papel)) {
      return NextResponse.json({ error: 'papel inválido' }, { status: 400 });
    }

    const patch: any = {};
    if (nome !== undefined) { patch.nome = nome; patch.nome_exibicao = nome; }
    if (papel) patch.papel = papel;

    if (Object.keys(patch).length) {
      const { error: upErr } = await supa.from('profiles').update(patch).eq('user_id', user_id);
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    if (papel || nome) {
      await supa.auth.admin.updateUserById(user_id, {
        user_metadata: {
          ...(papel ? { app_role: papel } : {}),
          ...(nome !== undefined ? { nome, nome_exibicao: nome } : {}),
        },
      });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'update_failed' }, { status: 500 });
  }
}
