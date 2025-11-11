// app/api/admin/users/update/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Papel = 'admin' | 'gestor' | 'externo';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const user_id = String(body?.user_id || '').trim();
    const nome = (body?.nome ?? null) as string | null;
    const nome_exibicao = (body?.nome_exibicao ?? nome ?? null) as string | null;
    const papel = (body?.papel || 'externo') as Papel;

    if (!user_id) return NextResponse.json({ error: 'user_id obrigatório' }, { status: 400 });
    if (!['admin', 'gestor', 'externo'].includes(papel))
      return NextResponse.json({ error: 'Papel inválido' }, { status: 400 });

    const supa = getServiceSupabase();
    const { error } = await supa
      .from('profiles')
      .update({ nome, nome_exibicao, papel })
      .eq('user_id', user_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro' }, { status: 500 });
  }
}
