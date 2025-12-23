// app/api/admin/fornecedores/get/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ ok: false, error: 'ID em falta' }, { status: 400 });

    const supa = getServiceSupabase();

    const { data, error } = await supa
      .from('fornecedores')
      .select(
        `
        id, empresa_id, codigo,
        denominacao, nif, email, telefone, ativo,
        tipo_fornecimento, nome_contacto, morada, concelho, cod_postal,
        forma_pagamento, observacoes,
        created_at, updated_at
      `
      )
      .eq('id', id)
      .maybeSingle();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    if (!data) return NextResponse.json({ ok: false, error: 'Fornecedor não encontrado' }, { status: 404 });

    return NextResponse.json({ ok: true, row: data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Falha ao carregar' }, { status: 500 });
  }
}
