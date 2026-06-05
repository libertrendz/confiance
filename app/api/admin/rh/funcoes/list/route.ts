/**
 * ============================================================
 * CONFIANCE ERP
 * Arquivo: app/api/admin/rh/funcoes/list/route.ts
 * ============================================================
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    return NextResponse.json({
      ok: true,

      env: {
        CONF_EMPRESA_ID:
          process.env.CONF_EMPRESA_ID ?? null,

        NODE_ENV:
          process.env.NODE_ENV ?? null,

        VERCEL_ENV:
          process.env.VERCEL_ENV ?? null,
      },
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
