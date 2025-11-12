import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

const UUID_RE = /^[0-9a-f-]{36}$/i;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = String(body?.id || '').trim();
    if (!UUID_RE.test(id)) return NextResponse.json({ ok: false, error: 'ID inválido' }, { status: 400 });

    const raw = process.env.CONF_EMPRESA_ID || '';
    const empresa_id = raw.trim();
    if (!UUID_RE.test(empresa_id)) {
      return NextResponse.json({ ok: false, error: `CONF_EMPRESA_ID inválido` }, { status: 500 });
    }

    // Campos permitidos
    const payload: any = {
      codigo: body?.codigo ?? null,
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
      ativo: body?.ativo ?? true,
    };

    const supa = getServiceSupabase();
    const { error } = await supa
      .from('fornecedores')
      .update(payload)
      .eq('empresa_id', empresa_id)
      .eq('id', id);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Erro inesperado' }, { status: 500 });
  }
}
