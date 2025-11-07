import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';

export async function GET() {
  const supa = getServerSupabase();

  // user logado
  const { data: u } = await supa.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return NextResponse.json({ error: 'no_session' }, { status: 401 });

  // empresa do ADM
  const { data: prof, error: profErr } = await supa
    .from('profiles')
    .select('empresa_id,papel')
    .eq('user_id', uid)
    .maybeSingle();

  if (profErr || !prof?.empresa_id) {
    return NextResponse.json({ error: 'no_empresa' }, { status: 400 });
  }

  // só admin/gestor
  if (!['admin', 'gestor'].includes(prof.papel as string)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // chama função segura
  const { data, error } = await supa
    .rpc('admin_users_list', { p_empresa: prof.empresa_id });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data ?? [] });
}
