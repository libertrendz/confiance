// app/api/admin/fornecedores/update/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function normalizeFormaPagamento(v: any): string | null {
  const s = String(v || '').trim().toUpperCase();
  if (!s) return null;
  if (s.includes('VISTA')) return 'A VISTA';
  if (s.includes('PARCEL')) return 'PARCELADO';
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const id = String((body as any)?.id || '').trim();
    if (!id) return NextResponse.json({ ok: false, error: 'ID em falta' }, { status: 400 });

    const payload: any = {
      denominacao: (body as any).denominacao ?? null,
      nif: (body as any).nif ?? null,
      email: (body as any).email ?? null,
      telefone: (body as any).telefone ?? null,
      ativo: !!(body as any).ativo,
      tipo_fornecimento: (body as any).tipo_fornecimento ?? null,
      nome_contacto: (body as any).nome_contacto ?? null,
      morada: (body as any).morada ?? null,
      concelho: (body as any).concelho ?? null,
      cod_postal: (body as any).cod_postal ?? null,
      observacoes: (body as any).observacoes ?? null,
      forma_pagamento: normalizeFormaPagamento((body as any).forma_pagamento),
      updated_at: new Date().toISOString(),
    };

    const supa = getServiceSupabase();

    const { data, error } = await supa
      .from('fornecedores')
      .update(payload)
      .eq('id', id)
      .select(
        `
        id, empresa_id, codigo,
        denominacao, nif, email, telefone, ativo,
        tipo_fornecimento, nome_contacto, morada, concelho, cod_postal,
        forma_pagamento, observacoes,
        created_at, updated_at
      `
      )
      .maybeSingle();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true, row: data ?? null }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Falha ao guardar' }, { status: 500 });
  }
}
