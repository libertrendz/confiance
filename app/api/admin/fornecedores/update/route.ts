// app/api/admin/fornecedores/update/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = String(body?.id || '').trim();
    if (!id) return NextResponse.json({ error: 'ID em falta' }, { status: 400 });

    const payload = {
      denominacao: body?.denominacao ?? null,
      tipo_fornecimento: body?.tipo_fornecimento ?? null,
      nif: body?.nif ?? null,
      email: body?.email ?? null,
      telefone: body?.telefone ?? null,
      nome_contacto: body?.nome_contacto ?? null,
      morada: body?.morada ?? null,
      concelho: body?.concelho ?? null,
      cod_postal: body?.cod_postal ?? null,
      forma_pagamento: body?.forma_pagamento ?? null,
      observacoes: body?.observacoes ?? null,
      ativo: typeof body?.ativo === 'boolean' ? body.ativo : true,
      updated_at: new Date().toISOString(),
    };

    const supa = getServiceSupabase();
    const empresa_id = process.env.CONF_EMPRESA_ID!;
    if (!empresa_id) return NextResponse.json({ error: 'Empresa não configurada' }, { status: 500 });

    const { error } = await supa
      .from('fornecedores')
      .update(payload)
      .eq('id', id)
      .eq('empresa_id', empresa_id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Falha ao atualizar' }, { status: 500 });
  }
}
