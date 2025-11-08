// app/api/admin/users/list/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export async function GET() {
  try {
    const supa = getServiceSupabase();

    // 1) Traz até 1000 users (mais que suficiente para agora)
    const { data: usersData, error: listErr } = await supa.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listErr) throw new Error(listErr.message);

    const users = usersData?.users || [];
    const ids = users.map(u => u.id);
    if (!ids.length) return NextResponse.json([]);

    // 2) Profiles correspondentes
    const { data: profs, error: pErr } = await supa
      .from('profiles')
      .select('user_id, empresa_id, papel, nome, nome_exibicao, created_at, updated_at, id')
      .in('user_id', ids);

    if (pErr) throw new Error(pErr.message);

    // 3) Merge
    const byId = new Map(profs?.map(p => [p.user_id, p]) || []);
    const rows = users.map(u => {
      const p = byId.get(u.id);
      return {
        user_id: u.id,
        email: u.email,
        last_sign_in_at: u.last_sign_in_at,
        papel: p?.papel ?? 'externo',
        empresa_id: p?.empresa_id ?? null,
        nome: p?.nome ?? null,
        nome_exibicao: p?.nome_exibicao ?? null,
        created_at: p?.created_at ?? u.created_at,
        updated_at: p?.updated_at ?? u.updated_at,
        profile_id: p?.id ?? null,
      };
    });

    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro ao listar' }, { status: 500 });
  }
}
