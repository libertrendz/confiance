// app/api/admin/users/list/route.ts
import { NextResponse } from 'next/server';
import { getServerSupabase, getServiceSupabase } from '@/lib/supabaseServer';

export async function GET() {
  try {
    // 1) tenta com sessão do cookie (admin com RLS)
    const supa = getServerSupabase();
    const { data: me } = await supa.auth.getUser();
    const isLogged = !!me.user;

    if (isLogged) {
      // Lista via view segura (recomendada): admin_users_v
      const { data, error } = await supa
        .from('admin_users_v')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return NextResponse.json({ ok: true, source: 'rls', data });
    }

    // 2) fallback: service role (precisa SUPABASE_SERVICE_ROLE_KEY)
    const admin = getServiceSupabase();
    const { data: users, error } = await admin.auth.admin.listUsers();
    if (error) throw error;

    // Junta com profiles (se existir)
    const ids = users.users.map(u => u.id);
    let profiles: any[] = [];
    if (ids.length) {
      const { data: profs } = await admin
        .from('profiles')
        .select('user_id, nome, nome_exibicao, papel, empresa_id')
        .in('user_id', ids);
      profiles = profs || [];
    }

    const merged = users.users.map(u => {
      const p = profiles.find(pp => pp.user_id === u.id);
      return {
        user_id: u.id,
        email: u.email,
        last_sign_in_at: u.last_sign_in_at,
        papel: p?.papel || null,
        nome: p?.nome || null,
        nome_exibicao: p?.nome_exibicao || null,
        empresa_id: p?.empresa_id || null,
        created_at: u.created_at,
      };
    });

    return NextResponse.json({ ok: true, source: 'service', data: merged });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || String(e) }, { status: 500 });
  }
}
