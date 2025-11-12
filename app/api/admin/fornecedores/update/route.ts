import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

const EMPRESA = process.env.CONF_EMPRESA_ID!;
const ALLOWED_FP = new Set(['À VISTA','PARCELADO']);

function nz(v: any) {
  const s = (v ?? '').toString().trim();
  return s.length ? s : null;
}

export async function POST(req: Request) {
  try {
    if (!EMPRESA) return NextResponse.json({ error: 'CONF_EMPRESA_ID ausente' }, { status: 400 });
    const body = await req.json().catch(() => ({}));
    const id = nz(body.id);
    if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });

    let forma_pagamento = nz(body.forma_pagamento)?.toUpperCase() || null;
    if (forma_pagamento && !ALLOWED_FP.has(forma_pagamento)) forma_pagamento = 'À VISTA';

    const payload: Record<string, any> = {
      denominacao: nz(body.denominacao),
      tipo_fornecimento: nz(body.tipo_fornecimento),
      nif: nz(body.nif),
      email: nz(body.email),
      telefone: nz(body.telefone),
      nome_contacto: nz(body.nome_contacto),
      morada: nz(body.morada),
      concelho: nz(body.concelho),
      cod_postal: nz(body.cod_postal),
      forma_pagamento,
      observacoes: nz(body.observacoes),
      ativo: typeof body.ativo === 'boolean' ? body.ativo : undefined,
    };

    // remove undefined para não sobrescrever
    Object.keys(payload).forEach(k => payload[k] === undefined && delete (payload as any)[k]);

    if (!payload.denominacao) return NextResponse.json({ error: 'Denominação é obrigatória' }, { status: 400 });
    if (payload.nif && !/^\d{9}$/.test(payload.nif)) return NextResponse.json({ error: 'NIF inválido (9 dígitos)' }, { status: 400 });
    if (payload.telefone && !/^\d{9}$/.test(payload.telefone)) return NextResponse.json({ error: 'Telefone inválido (9 dígitos)' }, { status: 400 });
    if (payload.cod_postal && !/^\d{4}-\d{3}$/.test(payload.cod_postal)) return NextResponse.json({ error: 'Código postal inválido (XXXX-XXX)' }, { status: 400 });

    const supa = getServiceSupabase();
    const { error } = await supa.from('fornecedores').update(payload).eq('id', id).eq('empresa_id', EMPRESA);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro inesperado' }, { status: 500 });
  }
}
