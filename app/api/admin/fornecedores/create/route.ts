// app/api/admin/fornecedores/create/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

type Body = {
  denominacao: string;
  nif?: string | null;
  email?: string | null;
  telefone?: string | null;
  ativo?: boolean | null;

  tipo_fornecimento?: string | null;
  nome_contacto?: string | null;
  morada?: string | null;
  concelho?: string | null;
  cod_postal?: string | null;
  forma_pagamento?: string | null; // receber livre, normalizamos
  observacoes?: string | null;
};

function normalizeFP(x?: string | null) {
  if (!x) return null;
  const u = x.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
  if (u.includes('PARCEL')) return 'PARCELADO';
  if (u.includes('VISTA'))  return 'A VISTA';
  return null;
}

export async function POST(req: Request) {
  try {
    const supa = getServiceSupabase();
    const empresa_id = process.env.CONF_EMPRESA_ID || null;
    if (!empresa_id) {
      return NextResponse.json({ error: 'CONF_EMPRESA_ID ausente' }, { status: 400 });
    }

    const body = (await req.json()) as Body;
    if (!body?.denominacao?.trim()) {
      return NextResponse.json({ error: 'Denominação obrigatória' }, { status: 400 });
    }

    const payload = {
      empresa_id,
      codigo: null, // DB/trigger cuida (F001, F002…)
      denominacao: body.denominacao.trim(),
      nif: body.nif?.trim() || null,
      email: body.email?.trim() || null,
      telefone: body.telefone?.trim() || null,
      ativo: body.ativo ?? true,

      tipo_fornecimento: body.tipo_fornecimento?.trim() || null,
      nome_contacto: body.nome_contacto?.trim() || null,
      morada: body.morada?.trim() || null,
      concelho: body.concelho?.trim() || null,
      cod_postal: body.cod_postal?.trim() || null,
      forma_pagamento: normalizeFP(body.forma_pagamento),
      observacoes: body.observacoes?.trim() || null,
    };

    const { data, error } = await supa
      .from('fornecedores')
      .insert(payload)
      .select('id, codigo');

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, id: data?.[0]?.id, codigo: data?.[0]?.codigo ?? null });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Falha ao criar' }, { status: 500 });
  }
}
