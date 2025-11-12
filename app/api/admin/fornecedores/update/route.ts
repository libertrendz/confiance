// app/api/admin/fornecedores/update/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = body.id as string | undefined;
    if (!id) return NextResponse.json({ ok:false, error:'id em falta' }, { status:400 });

    const patch = {
      denominacao: body.denominacao ?? undefined,
      tipo_fornecimento: body.tipo_fornecimento ?? undefined,
      nif: body.nif ?? undefined,
      email: body.email ?? undefined,
      telefone: body.telefone ?? undefined,
      nome_contacto: body.nome_contacto ?? undefined,
      morada: body.morada ?? undefined,
      concelho: body.concelho ?? undefined,
      cod_postal: body.cod_postal ?? undefined,
      forma_pagamento: body.forma_pagamento ?? undefined,
      observacoes: body.observacoes ?? undefined,
      ativo: body.ativo ?? undefined,
    };

    const supa = getServiceSupabase();
    const { error } = await supa.from('fornecedores').update(patch).eq('id', id);
    if (error) throw error;

    return NextResponse.json({ ok:true });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:e?.message || 'Falha ao atualizar' }, { status:500 });
  }
}
