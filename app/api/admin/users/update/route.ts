// app/api/admin/users/update/route.ts
import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const supa = getServerSupabase({ req });
    const body = await req.json().catch(() => ({}));
    const { user_id, nome, nome_exibicao, papel } = body as {
      user_id: string;
      nome?: string;
      nome_exibicao?: string | null;
      papel?: 'admin' | 'gestor' | 'externo';
    };

    if (!user_id) return NextResponse.json({ error: 'user_id_required' }, { status: 400 });

    // Verifica sessão
    const { data: me, error: meErr } = await supa.auth.getUser();
    if (meErr || !me?.user) return NextResponse.json({ error: 'no_session' }, { status: 401 });

    // Atualiza apenas nas colunas existentes do profiles
    const patch: any = { updated_at: new Date().toISOString() };
    if (typeof nome !== 'undefined') patch.nome = (nome || '').trim();
    if (typeof nome_exibicao !== 'undefined') patch.nome_exibicao = nome_exibicao ? String(nome_exibicao).trim() : null;
    if (papel && ['admin', 'gestor', 'externo'].includes(papel)) patch.papel = papel;

    const { error } = await supa.from('profiles').update(patch).eq('user_id', user_id);
    if (error) return NextResponse.json({ error: 'db_update_failed', detail: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'fail' }, { status: 500 });
  }
}
