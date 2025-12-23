import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = String((body as any)?.id || '').trim();
    if (!id) return NextResponse.json({ error: 'ID em falta' }, { status: 400 });

    const forma_pagamento = (() => {
      const v = String((body as any)?.forma_pagamento || '').trim().toUpperCase();
      if (!v) return null;
      if (v.includes('VISTA')) return 'A VISTA';
      if (v.includes('PARCEL')) return 'PARCELADO';
      return null;
    })();

    const payload: any = {
      denominacao: (body as any)?.denominacao ?? null,
      nif: (body as any)?.nif ?? null,
      email: (body as any)?.email ?? null,
      telefone: (body as any)?.telefone ?? null,
      ativo: !!(body as any)?.ativo,
      tipo_fornecimento: (body as any)?.tipo_fornecimento ?? null,
      nome_contacto: (body as any)?.nome_contacto ?? null,
      morada: (body as any)?.morada ?? null,
      concelho: (body as any)?.concelho ?? null,
      cod_postal: (body as any)?.cod_postal ?? null,
      pais: (body as any)?.pais ?? null,
      observacoes: (body as any)?.observacoes ?? null,
      forma_pagamento,
      updated_at: new Date().toISOString(),
    };

    const supa = getServiceSupabase();

    // Atualiza e devolve o registro atualizado (útil pra debug e UI)
    const { data, error } = await supa
      .from('fornecedores')
      .update(payload)
      .eq('id', id)
      .select(`
        id, empresa_id, codigo,
        denominacao, nif, email, telefone, ativo,
        tipo_fornecimento, nome_contacto, morada, concelho, cod_postal, pais,
        forma_pagamento, observacoes,
        created_at, updated_at
      `)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return new NextResponse(JSON.stringify({ ok: true, row: data ?? null }), {
      status: 200,
      headers: { 'cache-control': 'no-store' },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Falha ao guardar' }, { status: 500 });
  }
}
