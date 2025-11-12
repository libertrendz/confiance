// app/api/admin/fornecedores/list/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export async function GET() {
  try {
    const empresa_id = process.env.CONF_EMPRESA_ID || null;
    if (!empresa_id) {
      return NextResponse.json({ ok: false, error: 'CONF_EMPRESA_ID ausente' }, { status: 500 });
    }

    const supa = getServiceSupabase();

    // Service role ignora RLS. Filtramos por empresa_id no servidor, sem depender de JWT.
    const { data, error } = await supa
      .from('fornecedores')
      .select('id,codigo,denominacao,nif,telefone,email,ativo')
      .eq('empresa_id', empresa_id)
      .order('codigo', { ascending: true });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, rows: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Erro inesperado' }, { status: 500 });
  }
}
