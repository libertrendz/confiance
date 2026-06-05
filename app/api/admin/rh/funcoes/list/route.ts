/**
 * ============================================================
 * CONFIANCE ERP
 * Arquivo: app/api/admin/rh/funcoes/list/route.ts
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
        {
          status: 500,
        },
      );
    }

    const supa = getServiceSupabase();

    const { data, error } = await supa
      .from('rh_funcoes')
      .select('id,nome')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('nome');

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        {
          status: 400,
        },
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
        error: e?.message || 'Erro inesperado',
      },
      {
        status: 500,
      },
    );
  }
}
