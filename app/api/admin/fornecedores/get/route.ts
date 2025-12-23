import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID em falta' }, { status: 400 });

    const supa = getServiceSupabase();
    const { data, error } = await supa
      .from('fornecedores')
      .select(`
        id, empresa_id, codigo,
        denominacao, nif, email, telefone, ativo,
        tipo_fornecimento, nome_contacto, morada, concelho, cod_postal, pais,
        forma_pagamento, observacoes,
        created_at, updated_at
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return new NextResponse(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'cache-control': 'no-store' },
      });
    }
    if (!data) {
      return new NextResponse(JSON.stringify({ error: 'Fornecedor não encontrado' }), {
        status: 404,
        headers: { 'cache-control': 'no-store' },
      });
    }

    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: { 'cache-control': 'no-store' },
    });
  } catch (e: any) {
    return new NextResponse(JSON.stringify({ error: e?.message || 'Falha ao carregar' }), {
      status: 500,
      headers: { 'cache-control': 'no-store' },
    });
  }
}
