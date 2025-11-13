// app/api/admin/fornecedores/update/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

type Body = {
  id: string;
  denominacao?: string | null;
  nif?: string | null;
  email?: string | null;
  telefone?: string | null;
  ativo?: boolean | null;

  tipo_fornecimento?: string | null;
  nome_contacto?: string | null;
  morada?: string | null;
  concelho?: string | null;
  cod_postal?: string | null;
  forma_pagamento?: string | null;
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
    const body = (await req.json()) as Body;
    if (!body?.id) {
      return NextResponse.json({ error: 'ID em falta' }, { status: 400 });
    }

    const patch: any = {};
    if (body.denominacao !== undefined) patch.denominacao = body.denominacao?.trim() || null;
    if (body.nif !== undefined) patch.nif = body.nif?.trim() || null;
    if (body.email !== undefined) patch.email = body.email?.trim() || null;
    if (body.telefone !== undefined) patch.telefone = body.telefone?.trim() || null;
    if (body.ativo !== undefined) patch.ativo = !!body.ativo;

    if (body.tipo_fornecimento !== undefined) patch.tipo_fornecimento = body.tipo_fornecimento?.trim() || null;
    if (body.nome_contacto !== undefined) patch.nome_contacto = body.nome_contacto?.trim() || null;
    if (body.morada !== undefined) patch.morada = body.morada?.trim() || null;
    if (body.concelho !== undefined) patch.concelho = body.concelho?.trim() || null;
    if (body.cod_postal !== undefined) patch.cod_postal = body.cod_postal?.trim() || null;
    if (body.forma_pagamento !== undefined) patch.forma_pagamento = normalizeFP(body.forma_pagamento);
    if (body.observacoes !== undefined) patch.observacoes = body.observacoes?.trim() || null;

    const { error } = await supa.from('fornecedores').update(patch).eq('id', body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Falha ao atualizar' }, { status: 500 });
  }
}
