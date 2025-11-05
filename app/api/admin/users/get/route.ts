// app/api/admin/users/get/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAdminSupabase } from '@/lib/supabaseAdmin';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function getCaller(token: string) {
  const supa = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supa.auth.getUser(token);
  if (error) throw error;
  return data.user;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = String(searchParams.get('id') || '');

    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return NextResponse.json({ error: 'missing_token' }, { status: 401 });

    const caller = await getCaller(token);
    const role = (caller.user_metadata?.app_role as string) || 'externo';
    if (role !== 'admin' && role !== 'gestor') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const admin = getAdminSupabase();

    const { data: p, error: pErr } = await admin
      .from('profiles')
      .select('user_id, nome, papel, empresa_id')
      .eq('user_id', id)
      .maybeSingle();
    if (pErr || !p) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const { data: u } = await admin.auth.admin.getUserById(id);

    return NextResponse.json({
      id,
      email: u.user?.email || null,
      nome: p.nome,
      papel: p.papel,
      empresa_id: p.empresa_id,
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'unexpected', details: e?.message }, { status: 500 });
  }
}
