// app/api/admin/users/list/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export async function GET() {
  try {
    const supa = getServiceSupabase();
    const { data, error } = await supa.from('v_adm_users').select('*').order('email', { nullsFirst: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Falha ao listar utilizadores' }, { status: 500 });
  }
}
