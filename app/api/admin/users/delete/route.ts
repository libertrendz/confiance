// app/api/admin/users/delete/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const { user_id } = await req.json();
    if (!user_id) return NextResponse.json({ error: 'user_id obrigatório' }, { status: 400 });

    const supa = getServiceSupabase();

    // remove profile primeiro (idempotente)
    await supa.from('profiles').delete().eq('user_id', user_id);

    // remove no auth
    const { error } = await supa.auth.admin.deleteUser(user_id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'erro' }, { status: 500 });
  }
}
