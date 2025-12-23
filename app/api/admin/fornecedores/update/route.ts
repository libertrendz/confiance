// app/api/admin/fornecedores/update/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function normNull(v: any) {
  const s = String(v ?? '').trim();
  return s ? s : null;
}

function normFormaPagamento(v: any): string | null {
  const s = String(v ?? '').trim().toUpperCase();
  if (!s) return null;
  if (s === 'A VISTA' || s.includes('VISTA')) return 'A VISTA';
  if (s === 'PARCELADO' || s.includes('PARCEL')) return 'PARCELADO';
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body?.id || '').trim();
    if (!id) return NextResponse.json({ error: 'ID em falta' }, { status: 400 });

    const payload: any = {
      denominacao: normNull(body.denominacao),
      nif: normNull(body.nif),
      email: normNull(body.email),
      telefone: normNull(body.telefone),
      ativo: !!body.ativo,

      tipo_fornecimento: normNull(body.tipo_fornecimento),
      nome_contacto: normNull(body.nome_contacto),

      morada: normNull(body.morada),
      concelho: normNull(body.concelho),
      cod_postal: normNull(body.cod_postal),

      observacoes: normNull(body.observacoes),
      forma_pagamento: normFormaPagamento(body.forma_pagamento),

      updated_at: new Date().toISOString(),
    };

    // denominacao é obrigatória no teu form – garante:
    if (!payload.denominacao) {
      return NextResponse.json({ error: 'denominacao é obrigatória' }, { status: 400 });
    }

    const supa = getServiceSupabase();
    const { error } = await supa.from('fornecedores').update(payload).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true }, { status: 200, headers: { 'cache-control': 'no-store' } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Falha ao guardar' }, { status: 500 });
  }
}
