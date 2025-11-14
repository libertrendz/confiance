// app/api/admin/colaboradores/update/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const id = String(body?.id || '').trim();
    if (!id) {
      return NextResponse.json(
        { ok: false, error: 'ID obrigatório' },
        { status: 400 },
      );
    }

    const nome = body?.nome ? String(body.nome).trim() : null;
    const nif = body?.nif ? String(body.nif).trim() : null;
    const email = body?.email ? String(body.email).trim() : null;
    const telefone = body?.telefone ? String(body.telefone).trim() : null;
    const tipo = body?.tipo ? String(body.tipo).trim() : null;
    const categoria = body?.categoria ? String(body.categoria).trim() : null;
    const contrato_tipo = body?.contrato_tipo
      ? String(body.contrato_tipo).trim()
      : null;
    const iban = body?.iban ? String(body.iban).trim() : null;

    const custo_hora =
      body?.custo_hora === null || body?.custo_hora === ''
        ? null
        : Number(body.custo_hora);

    const data_admissao =
      body?.data_admissao && String(body.data_admissao).trim() !== ''
        ? String(body.data_admissao)
        : null;

    const ativo = body?.ativo === false ? false : true;

    const pode_aceder_sistema = body?.pode_aceder_sistema === true;
    const pode_registar_ponto = body?.pode_registar_ponto === true;

    const supa = getServiceSupabase();

    const { error } = await supa
      .from('colaboradores')
      .update({
        nome,
        nif,
        email,
        telefone,
        tipo,
        categoria,
        contrato_tipo,
        iban,
        custo_hora,
        data_admissao,
        ativo,
        pode_aceder_sistema,
        pode_registar_ponto,
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Erro inesperado' },
      { status: 500 },
    );
  }
}
