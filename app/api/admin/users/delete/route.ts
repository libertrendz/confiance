import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const { user_id } = await req.json();
    if (!user_id) return NextResponse.json({ error: 'user_id obrigatório' }, { status: 400 });

    const supa = getServiceSupabase();
    // Remove só o profile; não apagamos auth.users aqui
    const { error } = await supa.from('profiles').delete().eq('user_id', user_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Falha ao eliminar utilizador' }, { status: 500 });
  }
}
