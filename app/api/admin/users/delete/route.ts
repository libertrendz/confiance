// app/api/admin/users/delete/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAdminSupabase } from '@/lib/supabaseAdmin';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function getCaller(token: string) {
  const supa = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supa.auth.getUser(token);
  if (error) throw error;
  return data.user;
}

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return NextResponse.json({ error: 'missing_token' }, { status: 401 });

    const caller = await getCaller(token);
    const role = (caller.user_metadata?.app_role as string) || 'externo';
    if (role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const userId = String(body.user_id || '');
    if (!userId) return NextResponse.json({ error: 'missing_user_id' }, { status: 400 });

    const admin = getAdminSupabase();

    // Deleta o utilizador do Auth (irreversível)
    const del = await admin.auth.admin.deleteUser(userId);
    if (del.error) return NextResponse.json({ error: 'delete_failed', details: del.error.message }, { status: 400 });

    // (Opcional) também remover profile
    await admin.from('profiles').delete().eq('user_id', userId);

    return NextResponse.json({ ok: true });
  } catch (e:any) {
    return NextResponse.json({ error: 'unexpected', details: e?.message }, { status: 500 });
  }
}
