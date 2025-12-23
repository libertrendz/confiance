import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = String(body?.id || '');
    if (!id) return NextResponse.json({ error: 'ID em falta' }, { status: 400 });

    // normalizações mínimas para não bater nas CHECK constraints
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
      // forma_pagamento: enum textual com duas opções aceites pelas CHECKs
            forma_pagamento: (() => {
      updated_at: new Date().toISOString(),
    };

    const supa = getServiceSupabase();
    const { error } = await supa.from('fornecedores').update(payload).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Falha ao guardar' }, { status: 500 });
  }
}
