/**
 * ============================================================
 * CONFIANCE ERP
 * Arquivo: app/api/admin/colaboradores/update/route.ts
 * Módulo: Colaboradores
 * Endpoint: Atualizar Colaborador
 *
 * Objetivo:
 * Atualizar dados cadastrais, contratuais e operacionais.
 *
 * RH-003.5:
 * - salario_tipo: hora | dia | mensal
 * - custo_hora para remuneração por hora
 * - custo_dia para remuneração por dia
 * - salario_atual para remuneração mensal
 * - data_saida
 *
 * Autor: Libertrendz
 * ============================================================
 */

import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type SalarioTipo = 'hora' | 'dia' | 'mensal' | null;

function cleanText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text === '' ? null : text;
}

function cleanDate(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text === '' ? null : text;
}

function cleanNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function cleanSalarioTipo(value: unknown): SalarioTipo {
  const text = cleanText(value);

  if (text === 'hora' || text === 'dia' || text === 'mensal') {
    return text;
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const id = cleanText(body?.id);

    if (!id) {
      return NextResponse.json(
        { ok: false, error: 'ID obrigatório' },
        { status: 400 },
      );
    }

    const nome = cleanText(body?.nome);
    const nif = cleanText(body?.nif);
    const email = cleanText(body?.email);
    const telefone = cleanText(body?.telefone);

    const morada = cleanText(body?.morada);
    const data_nasc = cleanDate(body?.data_nasc);

    const tipo = cleanText(body?.tipo);
    const funcao = cleanText(body?.funcao);
    const categoria = cleanText(body?.categoria);
    const contrato_tipo = cleanText(body?.contrato_tipo);

    const salario_tipo = cleanSalarioTipo(body?.salario_tipo);

    let custo_hora = cleanNumber(body?.custo_hora);
    let custo_dia = cleanNumber(body?.custo_dia);
    let salario_atual = cleanNumber(body?.salario_atual);

    if (salario_tipo === 'hora') {
      custo_dia = null;
      salario_atual = null;
    }

    if (salario_tipo === 'dia') {
      custo_hora = null;
      salario_atual = null;
    }

    if (salario_tipo === 'mensal') {
      custo_hora = null;
      custo_dia = null;
    }

    if (!salario_tipo) {
      custo_hora = null;
      custo_dia = null;
      salario_atual = null;
    }

    const iban = cleanText(body?.iban);

    const data_admissao = cleanDate(body?.data_admissao);
    const data_saida = cleanDate(body?.data_saida);

    const notas = cleanText(body?.notas);

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

        morada,
        data_nasc,

        tipo,
        funcao,
        categoria,
        contrato_tipo,

        salario_tipo,
        custo_hora,
        custo_dia,
        salario_atual,

        iban,

        data_admissao,
        data_saida,

        notas,

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
      {
        ok: false,
        error: e?.message || 'Erro inesperado',
      },
      { status: 500 },
    );
  }
}
