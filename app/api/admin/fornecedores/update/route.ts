// app/api/admin/fornecedores/update/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function normText(v: any) {
  const s = String(v ?? '').trim();
  return s ? s : null;
}

function normFormaPagamento(v: any): 'A VISTA' | 'PARCELADO' | null {
  const s = String(v ?? '').trim().toUpperCase();
  if (!s) return null;
  if (s.includes('VISTA')) return 'A VISTA';
  if (s.includes('PARCEL')) return 'PARCELADO';
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body?.id || '').trim();
    if (!id) return NextResponse.json({ error: 'ID em falta' }, { status: 400 });

    const payload: any = {
      denominacao: normText(body.denominacao),
      nif: normText(body.nif),
      email: normText(body.email),
      telefone: normText(body.telefone),
      ativo: !!body.ativo,
      tipo_fornecimento: normText(body.tipo_fornecimento),
      nome_contacto: normText(body.nome_contacto),
      morada: normText(body.morada),
      concelho: normText(body.concelho),
      cod_postal: normText(body.cod_postal),
      observacoes: normText(body.observacoes),
      forma_pagamento: normFormaPagamento(body.forma_pagamento),
      updated_at: new Date().toISOString(),
    };

    // evita mandar undefined
    Object.keys(payload).forEach((k) => {
      if (payload[k] === undefined) delete payload[k];
    });

    const supa = getServiceSupabase();

    const { data, error } = await supa
      .from('fornecedores')
      .update(payload)
      .eq('id', id)
      .select('id, forma_pagamento, updated_at')
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true, saved: data ?? null });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Falha ao guardar' }, { status: 500 });
  }
}
