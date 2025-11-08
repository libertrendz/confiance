// app/api/admin/users/list/route.ts
import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';

export async function GET(req: Request) {
  try {
    const supa = getServerSupabase({ req });

    const { data: me, error: meErr } = await supa.auth.getUser();
    if (meErr || !me?.user) {
      return NextResponse.json({ error: 'no_session' }, { status: 401 });
    }

    // Lista de perfis da empresa do utilizador logado
    const { data: myProf } = await supa
      .from('profiles')
      .select('empresa_id')
      .eq('user_id', me.user.id)
      .maybeSingle();

    const empresa_id = myProf?.empresa_id || null;

    const q = supa
      .from('profiles')
      .select('id,user_id,empresa_id,papel,nome,nome_exibicao,created_at,updated_at')
      .order('created_at', { ascending: true });

    const { data, error } = empresa_id
      ? await q.eq('empresa_id', empresa_id)
      : await q.is('empresa_id', null);

    if (error) throw error;

    // Sem depender de auth.users. Email só aparece se você decidir adicioná-lo no schema depois.
    return NextResponse.json({ items: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'fail' }, { status: 500 });
  }
}
