// app/api/admin/users/get/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = String(searchParams.get('id') || '');

    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

    const supa = getServiceSupabase();

    const { data, error } = await supa
      .rpc('exec_sql', {
        q: `
        select 
          u.id as user_id,
          u.email,
          u.last_sign_in_at,
          p.papel,
          p.empresa_id,
          p.nome,
          p.nome_exibicao,
          p.created_at,
          p.updated_at,
          p.id as profile_id
        from auth.users u
        left join public.profiles p on p.user_id = u.id
        where u.id = $1
        `,
        params: [id],
      });

    if (error) throw error;
    if (!data?.length) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

    return NextResponse.json(data[0]);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'erro' }, { status: 500 });
  }
}
