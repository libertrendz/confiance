// app/api/admin/fornecedores/create/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const empresa_id = process.env.CONF_EMPRESA_ID!;
    if (!empresa_id) return NextResponse.json({ ok:false, error:'CONF_EMPRESA_ID em falta' }, { status:400 });

    const payload = {
      empresa_id,
      codigo: body.codigo || null,                  // se nulo, DB gera (regra já criada)
      denominacao: body.denominacao?.trim() || null,
      tipo_fornecimento: body.tipo_fornecimento?.trim() || null,
      nif: body.nif?.trim() || null,
      email: body.email?.trim() || null,
      telefone: body.telefone?.trim() || null,
      nome_contacto: body.nome_contacto?.trim() || null,
      morada: body.morada?.trim() || null,
      concelho: body.concelho?.trim() || null,
      cod_postal: body.cod_postal?.trim() || null,
      forma_pagamento: body.forma_pagamento || null,
      observacoes: body.observacoes?.trim() || null,
      ativo: body.ativo ?? true,
    };

    // validações mínimas (DB também valida)
    if (!payload.denominacao) return NextResponse.json({ ok:false, error:'denominacao obrigatória' }, { status:400 });

    const supa = getServiceSupabase();
    const { data, error } = await supa.from('fornecedores').insert(payload).select('id,codigo').single();
    if (error) throw error;

    return NextResponse.json({ ok:true, id:data?.id, codigo:data?.codigo });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:e?.message || 'Falha ao criar' }, { status:500 });
  }
}
