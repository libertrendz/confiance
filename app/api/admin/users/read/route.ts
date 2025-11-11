// app/api/admin/users/read/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id')?.trim();
    if (!id) {
      return NextResponse.json({ error: 'ID em falta' }, { status: 400 });
    }

    const supa = getServiceSupabase();
    // v_adm_colaboradores: view sem recursão (auth.users + profiles)
    const { data, error } = await supa
      .from('v_adm_colaboradores')
      .select('*')
      .eq('user_id', id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
    }
    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro inesperado' }, { status: 500 });
  }
}
