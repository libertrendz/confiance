// app/adm/utilizadores/list/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

// Lista de utilizadores para o painel ADM.
// Depende da view SQL v_adm_users (public) que junta auth.users + profiles.
export async function GET() {
  try {
    const supa = getServiceSupabase();

    const { data, error } = await supa
      .from('v_adm_users')
      .select(
        'user_id,email,papel,empresa_id,nome,nome_exibicao,last_sign_in_at,created_at,updated_at,profile_id'
      )
      .order('nome_exibicao', { nullsFirst: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data ?? []);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Falha ao listar' }, { status: 500 });
  }
}
