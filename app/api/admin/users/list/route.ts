// app/api/admin/users/list/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supa = getServiceSupabase();
    const { data, error } = await supa
      .from('v_adm_users')
      .select('*')
      .order('email', { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return new NextResponse(JSON.stringify(data ?? []), {
      status: 200,
      headers: { 'cache-control': 'no-store' },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro' }, { status: 500 });
  }
}
