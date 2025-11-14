// app/api/admin/colaboradores/get/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const empresaId = process.env.CONF_EMPRESA_ID;
    if (!empresaId) {
      return NextResponse.json({ ok: false, error: 'CONF_EMPRESA_ID em falta' }, { status: 500 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ ok: false, error: 'ID em falta' }, { status: 400 });
    }

    const supa = getServiceSupabase();

    const { data, error } = await supa
      .from('colaboradores')
      .select(
        `
        id,
        empresa_id,
        user_id,
        nome,
        nif,
        email,
        telefone,
        tipo,
        custo_hora,
        categoria,
        contrato_tipo,
        iban,
        data_admissao,
        ativo,
        created_at,
        updated_at
      `
      )
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: `Erro ao carregar colaborador: ${error.message}` },
        { status: 400 },
      );
    }

    if (!data) {
      return NextResponse.json({ ok: false, error: 'Colaborador não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, record: data });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Erro inesperado ao carregar colaborador' },
      { status: 500 },
    );
  }
}
