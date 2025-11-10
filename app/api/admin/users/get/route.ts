// app/api/admin/users/get/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export async function GET(req: Request) {
  try {
    const supa = getServiceSupabase();
    const { searchParams } = new URL(req.url);
    const id = String(searchParams.get('id') || '');

    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

    const { data, error } = await supa
      .from('v_adm_users')
      .select('*')
      .eq('user_id', id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'get_failed' }, { status: 500 });
  }
}
