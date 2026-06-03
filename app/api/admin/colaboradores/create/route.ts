/**
 * ============================================================
 * CONFIANCE ERP
 * Arquivo: app/api/admin/colaboradores/create/route.ts
 * Módulo: Colaboradores
 * Endpoint: Criar Colaborador
 *
 * Objetivo:
 * Criar colaborador associado à empresa ativa do sistema.
 *
 * Autor: Libertrendz
 * ============================================================
 */

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

    const morada = body?.morada ? String(body.morada).trim() : null;

    const data_nasc =
      body?.data_nasc && String(body.data_nasc).trim() !== ''
        ? String(body.data_nasc)
        : null;

    const tipo = body?.tipo ? String(body.tipo).trim() : null;
    const funcao = body?.funcao ? String(body.funcao).trim() : null;
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

    const notas = body?.notas ? String(body.notas).trim() : null;

    const ativo = body?.ativo === false ? false : true;

    const pode_aceder_sistema = body?.pode_aceder_sistema === true;
    const pode_registar_ponto = body?.pode_registar_ponto === true;

    if (!nome) {
      return NextResponse.json(
        { ok: false, error: 'Nome obrigatório' },
        { status: 400 },
      );
    }

    const empresaId = process.env.CONF_EMPRESA_ID;

    if (!empresaId) {
      return NextResponse.json(
        { ok: false, error: 'CONF_EMPRESA_ID em falta' },
        { status: 500 },
      );
    }

    const supa = getServiceSupabase();

    const { data, error } = await supa
      .from('colaboradores')
      .insert([
        {
          empresa_id: empresaId,

          nome,
          nif,
          email,
          telefone,
          morada,
          data_nasc,

          tipo,
          funcao,
          categoria,
          contrato_tipo,

          custo_hora,
          iban,
          data_admissao,

          notas,

          ativo,
          pode_aceder_sistema,
          pode_registar_ponto,
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

    return NextResponse.json({
      ok: true,
      id: data.id,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Erro inesperado' },
      { status: 500 },
    );
  }
}
