// app/api/admin/users/list/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

type Papel = 'admin' | 'gestor' | 'externo';

export async function GET() {
  try {
    const supa = getServiceSupabase();

    // auth.users
    const lu: any = await supa.auth.admin.listUsers({ page: 1, perPage: 1000 } as any);
    if (lu.error) return NextResponse.json({ error: lu.error.message }, { status: 500 });
    const users: any[] = lu?.data?.users || [];

    // profiles
    const { data: profs, error: pe } = await supa
      .from('profiles')
      .select('id, user_id, empresa_id, papel, nome, nome_exibicao, created_at, updated_at');
    if (pe) return NextResponse.json({ error: pe.message }, { status: 500 });

    const profByUser = new Map<string, any>();
    for (const p of profs || []) profByUser.set(p.user_id, p);

    const rows = users.map(u => {
      const p = profByUser.get(u.id) || {};
      return {
        user_id: u.id,
        email: u.email || null,
        last_sign_in_at: u.last_sign_in_at || null,
        papel: (p.papel || (u.user_metadata?.app_role as Papel) || 'externo') as Papel,
        empresa_id: p.empresa_id || null,
        nome: p.nome || u.user_metadata?.nome || null,
        nome_exibicao: p.nome_exibicao || u.user_metadata?.nome_exibicao || null,
        created_at: p.created_at || null,
        updated_at: p.updated_at || null,
        profile_id: p.id || null,
      };
    });

    return NextResponse.json(rows, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro inesperado' }, { status: 500 });
  }
}
