// app/api/admin/users/list/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

// Retorna perfis + email (via Admin API), com paginação simples
export async function GET() {
  try {
    const admin = getServiceSupabase();

    // 1) Busca perfis no nosso schema
    const { data: profiles, error: pErr } = await admin
      .from('profiles')
      .select('id, user_id, empresa_id, papel, nome, nome_exibicao, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (pErr) throw pErr;

    // 2) Traz todos os users do Auth para mapear email por user_id
    //    (ajusta page/limit se tiveres >1000 utilizadores)
    const { data: usersPage, error: uErr } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (uErr) throw uErr;

    const emailById = new Map<string, string>();
    for (const u of usersPage.users) {
      if (u.id) emailById.set(u.id, u.email ?? '');
    }

    const result = (profiles ?? []).map((p) => ({
      ...p,
      email: emailById.get(p.user_id) ?? '',
    }));

    return NextResponse.json({ ok: true, data: result });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'list_failed' },
      { status: 500 }
    );
  }
}
