import { NextResponse } from 'next/server';
import { getAdminClient } from '../../_supabase';

export async function POST(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) throw new Error('id obrigatório');

    const supa = getAdminClient();

    // Remove profile primeiro (RLS off via service role)
    const { error: pErr } = await supa.from('profiles').delete().eq('user_id', id);
    if (pErr) throw pErr;

    // Remove user do Auth
    const { error: uErr } = await supa.auth.admin.deleteUser(id);
    if (uErr) throw uErr;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'fail' }, { status: 500 });
  }
}
