import { NextResponse } from 'next/server';
import { getAdminClient } from '../../_supabase';

export async function POST(req: Request) {
  try {
    const { id, nome, papel } = await req.json();
    if (!id) throw new Error('id obrigatório');

    const supa = getAdminClient();

    // Atualiza somente profiles
    const patch: any = {};
    if (typeof nome === 'string') patch.nome_exibicao = nome;
    if (typeof papel === 'string') patch.papel = papel;

    if (Object.keys(patch).length) {
      const { error } = await supa.from('profiles').update(patch).eq('user_id', id);
      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'fail' }, { status: 500 });
  }
}
