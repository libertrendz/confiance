// app/api/admin/users/list/route.ts
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

export async function GET(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return NextResponse.json({ error: 'missing_token' }, { status: 401 });
    const caller = await getCaller(token);
    const role = (caller.user_metadata?.app_role as string) || 'externo';
    if (role !== 'admin' && role !== 'gestor') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const admin = getAdminSupabase();
    // auth.users (email) + profiles (nome/papel)
    const { data: profiles, error: pErr } = await admin
      .from('profiles')
      .select('user_id, nome, papel');
    if (pErr) throw pErr;

    const ids = profiles.map(p => p.user_id);
    const { data: users, error: uErr } = await admin.auth.admin.listUsers();
    if (uErr) return NextResponse.json({ error: 'users_list_failed', details: uErr.message }, { status: 400 });

    const rows = users.users
      .filter(u => ids.includes(u.id))
      .map(u => {
        const p = profiles.find(x => x.user_id === u.id);
        return { id: u.id, email: u.email, nome: p?.nome ?? null, papel: p?.papel ?? 'externo' };
      });

    return NextResponse.json({ rows });
  } catch (e:any) {
    return NextResponse.json({ error: 'unexpected', details: e?.message }, { status: 500 });
  }
}
