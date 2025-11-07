// app/api/admin/users/update/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type Papel = 'admin' | 'gestor' | 'externo';

export async function PATCH(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return NextResponse.json({ ok: false, error: 'Missing SUPABASE envs' }, { status: 500 });
    }
    const admin = createClient(url, serviceKey);

    const body = await req.json().catch(() => ({}));
    const id = String(body?.id || '').trim(); // profiles.id (uuid)
    const nome = (body?.nome ?? '').toString().trim();
    const nome_exibicao = (body?.nome_exibicao ?? '').toString().trim();
    const papel = (body?.papel ?? '').toString().trim() as Papel;

    if (!id) return NextResponse.json({ ok: false, error: 'id obrigatório' }, { status: 400 });
    if (papel && !['admin', 'gestor', 'externo'].includes(papel))
      return NextResponse.json({ ok: false, error: 'papel inválido' }, { status: 400 });

    const payload: Record<string, any> = {};
    if (nome) payload.nome = nome;
    if (nome_exibicao) payload.nome_exibicao = nome_exibicao;
    if (papel) payload.papel = papel;

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ ok: false, error: 'Nada para atualizar' }, { status: 400 });
    }

    const { error } = await admin.from('profiles').update(payload).eq('id', id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Erro inesperado' }, { status: 500 });
  }
}
