// app/api/admin/users/list/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

type Row = {
  user_id: string;
  email: string | null;
  last_sign_in_at: string | null;
  papel: 'admin' | 'gestor' | 'externo' | null;
  empresa_id: string | null;
  nome: string | null;
  nome_exibicao: string | null;
  created_at: string | null;
  updated_at: string | null;
  profile_id: string | null;
};

export async function GET() {
  try {
    const supa = getServiceSupabase();

    // 1) Users (auth)
    const { data: list } = await supa.auth.admin.listUsers({ page: 1, perPage: 500 });
    const users = list?.users || [];

    // 2) Profiles
    const ids = users.map(u => u.id);
    let profiles: any[] = [];
    if (ids.length) {
      const { data: p } = await supa
        .from('profiles')
        .select('id, user_id, empresa_id, papel, nome, nome_exibicao, created_at, updated_at')
        .in('user_id', ids as string[]);
      profiles = p || [];
    }

    const merged: Row[] = users.map(u => {
      const p = profiles.find(pr => pr.user_id === u.id);
      return {
        user_id: u.id,
        email: u.email ?? null,
        last_sign_in_at: u.last_sign_in_at ?? null,
        papel: p?.papel ?? (u.user_metadata?.app_role ?? null),
        empresa_id: p?.empresa_id ?? null,
        nome: p?.nome ?? (u.user_metadata?.nome ?? null),
        nome_exibicao: p?.nome_exibicao ?? (u.user_metadata?.nome_exibicao ?? null),
        created_at: p?.created_at ?? null,
        updated_at: p?.updated_at ?? null,
        profile_id: p?.id ?? null,
      };
    });

    return NextResponse.json(merged);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Falha ao listar' }, { status: 500 });
  }
}
