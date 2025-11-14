// app/api/admin/colaboradores/create/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const nome = String(body?.nome || '').trim();
    const nif = body?.nif ? String(body.nif).trim() : null;
    const email = body?.email ? String(body.email).trim() : null;
    const telefone = body?.telefone ? String(body.telefone).trim() : null;
    const tipo = body?.tipo ? String(body.tipo).trim() : null;

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

    if (!nome) {
      return NextResponse.json(
        { ok: false, error: 'Nome obrigatório' },
        { status: 400 },
      );
    }

    const supa = getServiceSupabase();

    const { data, error } = await supa
      .from('colaboradores')
      .insert([
        {
          nome,
          nif,
          email,
          telefone,
          tipo,
          custo_hora,
          data_admissao,
          ativo,
          pode_aceder_sistema,
          pode_registar_ponto,
          // empresa_id: default via função/DEFAULT da tabela
        },
      ])
      .select('id')
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Erro inesperado' },
      { status: 500 },
    );
  }
}
