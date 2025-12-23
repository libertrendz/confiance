// app/api/admin/fornecedores/update/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

function normalizeFormaPagamento(v: any): string | null {
  const s = String(v || '').trim().toUpperCase();
  if (!s) return null;
  if (s.includes('VISTA')) return 'A VISTA';
  if (s.includes('PARCEL')) return 'PARCELADO';
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = String(body?.id || '').trim();
    if (!id) return NextResponse.json({ error: 'ID em falta' }, { status: 400 });

    const payload: any = {
      denominacao: body.denominacao ?? null,
      nif: body.nif ?? null,
      email: body.email ?? null,
      telefone: body.telefone ?? null,
      ativo: !!body.ativo,
      tipo_fornecimento: body.tipo_fornecimento ?? null,
      nome_contacto: body.nome_contacto ?? null,
      morada: body.morada ?? null,
      concelho: body.concelho ?? null,
      cod_postal: body.cod_postal ?? null,
      observacoes: body.observacoes ?? null,
      forma_pagamento: normalizeFormaPagamento(body.forma_pagamento),
      updated_at: new Date().toISOString(),
    };

    const supa = getServiceSupabase();
    const { data, error } = await supa
      .from('fornecedores')
      .update(payload)
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data) return NextResponse.json({ error: 'Fornecedor não encontrado' }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Falha ao guardar' }, { status: 500 });
  }
}
