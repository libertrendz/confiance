/**
 * ============================================================
 * CONFIANCE ERP
 * Arquivo: app/api/admin/colaboradores/list/route.ts
 * Módulo: Colaboradores
 * Endpoint: Listagem de Colaboradores
 *
 * Objetivo:
 * Disponibilizar dados resumidos para a área de RH.
 *
 * Autor: Libertrendz
 * ============================================================
 */

import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const empresaId = process.env.CONF_EMPRESA_ID;

    if (!empresaId) {
      return NextResponse.json(
        {
          ok: false,
          error: 'CONF_EMPRESA_ID em falta',
        },
        { status: 500 },
      );
    }

    const supa = getServiceSupabase();

    const { data, error } = await supa
      .from('colaboradores')
      .select(`
        id,
        nome,
        funcao,
        categoria,
        contrato_tipo,
        data_admissao,
        ativo
      `)
      .eq('empresa_id', empresaId)
      .order('nome', { ascending: true });

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: `Erro ao listar colaboradores: ${error.message}`,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      rows: data ?? [],
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || 'Erro inesperado ao listar colaboradores',
      },
      { status: 500 },
    );
  }
}
