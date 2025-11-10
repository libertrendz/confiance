// app/api/admin/users/list/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export async function GET() {
  try {
    const supa = getServiceSupabase();

    // v_adm_users deve existir; se não existir, cai no fallback do SELECT manual
    let rows: any[] = [];
    const { data, error } = await supa.from('v_adm_users').select('*').order('last_sign_in_at', { ascending: false });
    if (!error && data) {
      rows = data;
    } else {
      const q = `
        select
          au.id as user_id,
          au.email,
          au.last_sign_in_at,
          p.papel,
          p.empresa_id,
          p.nome,
          p.nome_exibicao,
          p.created_at,
          p.updated_at,
          p.id as profile_id
        from auth.users au
        left join public.profiles p on p.user_id = au.id
        order by au.last_sign_in_at desc nulls last
      `;
      const r = await supa.rpc('exec_direct_sql', { q }); // se não tiver esse helper, vamos direto:
      if (!r || (r as any).error) {
        // fallback final sem RPC
        const { data: au } = await supa.from('auth_users_view').select('*'); // se tiver uma view auxiliar
        rows = au || [];
      } else {
        rows = (r as any).data || [];
      }
    }

    return NextResponse.json(rows, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'list_failed' }, { status: 500 });
  }
}
