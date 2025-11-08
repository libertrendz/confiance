// app/api/admin/users/list/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export async function GET() {
  try {
    const admin = getServiceSupabase();

    // Lista de usuários (Auth)
    const { data: page } = await admin.auth.admin.listUsers();
    const users = page?.users ?? [];

    // Puxa profiles por user_id (em lote)
    const ids = users.map(u => u.id);
    let profilesByUser: Record<string, any> = {};
    if (ids.length) {
      const { data: profs, error: profErr } = await admin
        .from('profiles')
        .select('user_id, empresa_id, papel, nome_exibicao, nome')
        .in('user_id', ids);
      if (profErr) throw profErr;
      profilesByUser = Object.fromEntries((profs || []).map((p: any) => [p.user_id, p]));
    }

    const rows = users.map(u => ({
      id: u.id,
      email: u.email,
      last_sign_in_at: u.last_sign_in_at,
      papel: profilesByUser[u.id]?.papel ?? (u.user_metadata?.app_role ?? null),
      nome_exibicao: profilesByUser[u.id]?.nome_exibicao ?? (u.user_metadata?.nome_exibicao ?? null),
      empresa_id: profilesByUser[u.id]?.empresa_id ?? null,
    }));

    return NextResponse.json({ ok: true, rows });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'list_failed' }, { status: 500 });
  }
}
