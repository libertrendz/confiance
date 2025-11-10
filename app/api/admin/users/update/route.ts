import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

type Papel = 'admin' | 'gestor' | 'externo';

export async function POST(req: Request) {
  try {
    const { user_id, nome, papel } = await req.json();
    if (!user_id) return NextResponse.json({ error: 'user_id obrigatório' }, { status: 400 });
    if (papel && !['admin','gestor','externo'].includes(papel))
      return NextResponse.json({ error: 'papel inválido' }, { status: 400 });

    const supa = getServiceSupabase();
    const payload: any = {
      user_id,
      updated_at: new Date().toISOString(),
    };
    if (typeof nome !== 'undefined') {
      payload.nome = nome || null;
      payload.nome_exibicao = nome || null;
    }
    if (papel) payload.papel = papel;

    const { error } = await supa.from('profiles').upsert(payload, { onConflict: 'user_id' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Falha ao atualizar utilizador' }, { status: 500 });
  }
}
