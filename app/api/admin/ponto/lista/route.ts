// app/api/admin/ponto/lista/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Handler ADMIN do módulo Ponto — versão final.
 *
 * - Exige x-admin-secret
 * - Usa Supabase SERVICE ROLE (admin)
 * - Lista registros de ponto via RPC oficial
 * - Paginação e filtro por usuarioId
 * - Nunca expõe empresaId (multi-tenant seguro)
 */

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;
const API_ADMIN_SECRET = process.env.API_ADMIN_SECRET!;

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

export async function POST(req: Request) {
  try {
    // ----- Segurança ADMIN ----- //
    const provided = req.headers.get('x-admin-secret');
    if (!provided || provided !== API_ADMIN_SECRET) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // ----- Body ----- //
    const body = await req.json().catch(() => ({}));

    const usuarioId = body.usuarioId ?? null;
    const limit = body.limit ?? 50;
    const offset = body.offset ?? 0;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured' },
        { status: 500 }
      );
    }

    // ----- Admin client (service role) ----- //
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
      auth: { persistSession: false }
    });

    // ----- Chamada RPC ----- //
    const { data, error } = await supabase.rpc('rpc_pontos_lista', {
      p_usuario_id: usuarioId,
      p_limit: limit,
      p_offset: offset
    });

    if (error) {
      console.error('rpc_pontos_lista error', error);
      return NextResponse.json(
        { ok: false, error: String(error.message || error) },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, result: data },
      { status: 200 }
    );

  } catch (err: any) {
    console.error('admin/ponto/lista unhandled error', err);
    return NextResponse.json(
      { ok: false, error: String(err.message || err) },
      { status: 500 }
    );
  }
}
