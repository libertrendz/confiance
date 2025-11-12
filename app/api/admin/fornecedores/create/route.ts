// app/api/admin/fornecedores/create/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

const EMPRESA = process.env.CONF_EMPRESA_ID!;

function nz(v: any) {
  const s = (v ?? '').toString().trim();
  return s.length ? s : null;
}

export async function POST(req: Request) {
  try {
    if (!EMPRESA) {
      return NextResponse.json({ error: 'CONF_EMPRESA_ID ausente' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    // Normalização leve
    const payload = {
      empresa_id: EMPRESA,
      denominacao: nz(body.denominacao),
      tipo_fornecimento: nz(body.tipo_fornecimento),
      nif: nz(body.nif),
      email: nz(body.email),
      telefone: nz(body.telefone),
      nome_contacto: nz(body.nome_contacto),
      morada: nz(body.morada),
      concelho: nz(body.concelho),
      cod_postal: nz(body.cod_postal),
      forma_pagamento: nz(body.forma_pagamento),
      observacoes: nz(body.observacoes),
      ativo: typeof body.ativo === 'boolean' ? body.ativo : true,
      // codigo NÃO vai aqui; trigger gera F### automaticamente
    };

    // Validações mínimas para não bater nas CHECK constraints
    if (!payload.denominacao) {
      return NextResponse.json({ error: 'Denominação é obrigatória' }, { status: 400 });
    }
    if (payload.nif && !/^\d{9}$/.test(payload.nif)) {
      return NextResponse.json({ error: 'NIF inválido (esperado 9 dígitos)' }, { status: 400 });
    }
    if (payload.telefone && !/^\d{9}$/.test(payload.telefone)) {
      return NextResponse.json({ error: 'Telefone inválido (esperado 9 dígitos)' }, { status: 400 });
    }
    if (payload.cod_postal && !/^\d{4}-\d{3}$/.test(payload.cod_postal)) {
      return NextResponse.json({ error: 'Código postal inválido (formato XXXX-XXX)' }, { status: 400 });
    }

    const supa = getServiceSupabase();

    const { data, error } = await supa
      .from('fornecedores')
      .insert(payload)
      .select('id, codigo')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, id: data?.id, codigo: data?.codigo });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro inesperado' }, { status: 500 });
  }
}
