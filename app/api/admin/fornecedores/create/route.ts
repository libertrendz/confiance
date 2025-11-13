import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

const EMPRESA = process.env.CONF_EMPRESA_ID!;
const ALLOWED_FP = new Set(['A VISTA','PARCELADO']);

function nz(v: any) {
  const s = (v ?? '').toString().trim();
  return s.length ? s : null;
}
function normFP(s: string | null): string | null {
  if (!s) return null;
  const up = s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
  if (up.includes('PARCEL')) return 'PARCELADO';
  if (up.includes('VISTA'))  return 'A VISTA';
  return null;
}

export async function POST(req: Request) {
  try {
    if (!EMPRESA) return NextResponse.json({ error: 'CONF_EMPRESA_ID ausente' }, { status: 400 });
    const b = await req.json().catch(() => ({}));

    const denominacao = nz(b.denominacao);
    if (!denominacao) return NextResponse.json({ error: 'Denominação é obrigatória' }, { status: 400 });

    const payload: Record<string, any> = {
      empresa_id: EMPRESA,
      denominacao,
      tipo_fornecimento: nz(b.tipo_fornecimento),
      nif: nz(b.nif),
      email: nz(b.email),
      telefone: nz(b.telefone),
      nome_contacto: nz(b.nome_contacto),
      morada: nz(b.morada),
      concelho: nz(b.concelho),
      cod_postal: nz(b.cod_postal),
      forma_pagamento: normFP(nz(b.forma_pagamento)),
      observacoes: nz(b.observacoes),
      ativo: typeof b.ativo === 'boolean' ? b.ativo : true,
    };

    if (payload.nif && !/^\d{9}$/.test(payload.nif))       return NextResponse.json({ error: 'NIF inválido (9 dígitos)' }, { status: 400 });
    if (payload.telefone && !/^\d{9}$/.test(payload.telefone)) return NextResponse.json({ error: 'Telefone inválido (9 dígitos)' }, { status: 400 });
    if (payload.cod_postal && !/^\d{4}-\d{3}$/.test(payload.cod_postal)) return NextResponse.json({ error: 'Código postal inválido (XXXX-XXX)' }, { status: 400 });
    if (payload.forma_pagamento && !ALLOWED_FP.has(payload.forma_pagamento)) payload.forma_pagamento = 'A VISTA';

    const supa = getServiceSupabase();

    // cria linha principal
    const { data, error } = await supa.from('fornecedores').insert(payload).select('id,codigo').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // se não veio código do trigger, gera Fxxx incremental
    if (!data?.codigo) {
      const { data: seqd } = await supa.rpc('forn_proximo_codigo'); // se tens a RPC; senão, remove esse bloco
      const codigo = seqd || null;
      if (codigo) {
        await supa.from('fornecedores').update({ codigo }).eq('id', data.id);
      }
    }

    return NextResponse.json({ ok: true, id: data?.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro inesperado' }, { status: 500 });
  }
}
