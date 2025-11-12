// app/api/admin/fornecedores/list/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export async function GET() {
  try {
    const supa = getServiceSupabase();
    const empresa_id = process.env.CONF_EMPRESA_ID!;
    if (!empresa_id) return NextResponse.json({ error: 'Empresa não configurada' }, { status: 500 });

    const { data, error } = await supa
      .from('fornecedores')
      .select('id,codigo,denominacao,nif,email,telefone,ativo,updated_at')
      .eq('empresa_id', empresa_id)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ rows: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Falha ao listar' }, { status: 500 });
  }
}
