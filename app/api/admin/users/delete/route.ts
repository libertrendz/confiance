// app/api/admin/users/delete/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const user_id = String(body?.user_id || '').trim();

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id obrigatório' },
        { status: 400 }
      );
    }

    const supa = getServiceSupabase();

    // 1) Apagar o perfil na public.profiles
    const { error: profErr } = await supa
      .from('profiles')
      .delete()
      .eq('user_id', user_id);

    if (profErr) {
      return NextResponse.json(
        { error: `Erro ao apagar profile: ${profErr.message}` },
        { status: 400 }
      );
    }

    // 2) Apagar o utilizador na auth.users
    const { error: authErr } = await supa.auth.admin.deleteUser(user_id);

    // Se já não existir, também não é o fim do mundo
    if (authErr && !authErr.message?.toLowerCase().includes('not found')) {
      return NextResponse.json(
        { error: `Erro ao apagar utilizador: ${authErr.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Erro inesperado' },
      { status: 500 }
    );
  }
}
