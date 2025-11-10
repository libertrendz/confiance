// app/api/admin/users/update/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

type Papel = 'admin' | 'gestor' | 'externo';

export async function POST(req: Request) {
  try {
    const { user_id, nome, nome_exibicao, papel } = await req.json();

    if (!user_id) return NextResponse.json({ error: 'user_id obrigatório' }, { status: 400 });
    if (papel && !['admin','gestor','externo'].includes(papel)) {
      return NextResponse.json({ error: 'Papel inválido' }, { status: 400 });
    }

    const supa = getServiceSupabase();

    // Atualiza metadata
    if (papel || nome || nome_exibicao) {
      const meta: Record<string, any> = {};
      if (papel) meta.app_role = papel as Papel;
      if (nome !== undefined) meta.nome = nome || null;
      if (nome_exibicao !== undefined) meta.nome_exibicao = nome_exibicao || null;

      const { error: mErr } = await supa.auth.admin.updateUserById(user_id, { user_metadata: meta });
      if (mErr) return NextResponse.json({ error: `Falha metadata: ${mErr.message}` }, { status: 400 });
    }

    // Upsert em profiles
    const payload: any = { user_id };
    if (papel) payload.papel = papel;
    if (nome !== undefined) payload.nome = nome || null;
    if (nome_exibicao !== undefined) payload.nome_exibicao = nome_exibicao || null;

    const { error: pErr } = await supa.from('profiles').upsert(payload, { onConflict: 'user_id' });
    if (pErr) return NextResponse.json({ error: `Falha profile: ${pErr.message}` }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro inesperado' }, { status: 500 });
  }
}
