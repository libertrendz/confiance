// app/api/admin/users/list/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return NextResponse.json({ ok: false, error: 'Missing SUPABASE envs' }, { status: 500 });
    }

    const admin = createClient(url, serviceKey);

    // Tabela profiles: user_id, empresa_id, papel, nome, nome_exibicao, created_at, updated_at, id
    const { data, error } = await admin
      .from('profiles')
      .select('id,user_id,empresa_id,papel,nome,nome_exibicao,created_at,updated_at')
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true, rows: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Erro inesperado' }, { status: 500 });
  }
}
