// app/api/ponto/bater/route.ts
//
// Handler oficial para registrar batida de ponto (modo Lite)
// Chamando o RPC canonical: public.rpc_ponto_bater(
//   p_empresa_id uuid,
//   p_usuario_id uuid,
//   p_tipo       text,
//   p_meta       jsonb
// )
//
// Segurança:
// - Protegido por x-admin-secret (bridge/admin).
// - Usa SUPABASE_SERVICE_ROLE para chamar o RPC direto.
//
// Request (JSON):
//   {
//     "usuarioId": "uuid do user/auth",
//     "empresaId": "uuid da empresa",
//     "tipo": "entrada" | "saida" | "...",
//     "meta": { ...qualquer json... }
//   }
//
// Response 200:
//   { ok: true, result: [{ id, batida_at }] }
//
// Erros 4xx/5xx com { ok:false, error: string }

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;
const API_ADMIN_SECRET = process.env.API_ADMIN_SECRET;

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: { Allow: 'POST, OPTIONS' },
  });
}

export async function POST(req: Request) {
  try {
    // 1) Autorização via x-admin-secret (modo bridge/admin)
    if (!API_ADMIN_SECRET) {
      console.error('API_ADMIN_SECRET missing in /api/ponto/bater');
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured (API_ADMIN_SECRET)' },
        { status: 500 }
      );
    }

    const provided = req.headers.get('x-admin-secret');
    if (!provided || provided !== API_ADMIN_SECRET) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2) Body parsing
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { ok: false, error: 'Invalid body' },
        { status: 400 }
      );
    }

    const usuarioId = body.usuarioId as string | undefined;
    const empresaId = body.empresaId as string | undefined;
    const tipo = body.tipo as string | undefined;
    const meta = (body.meta as Record<string, any> | undefined) ?? {};

    if (!usuarioId) {
      return NextResponse.json(
        { ok: false, error: 'Missing usuarioId' },
        { status: 400 }
      );
    }
    if (!empresaId) {
      return NextResponse.json(
        { ok: false, error: 'Missing empresaId' },
        { status: 400 }
      );
    }
    if (!tipo) {
      return NextResponse.json(
        { ok: false, error: 'Missing tipo' },
        { status: 400 }
      );
    }

    // 3) Supabase client (service role)
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      console.error('Missing SUPABASE envs in /api/ponto/bater');
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured (Supabase envs)' },
        { status: 500 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    // 4) Chamada RPC canonical
    const { data, error } = await supabase.rpc('rpc_ponto_bater', {
      p_empresa_id: empresaId,
      p_usuario_id: usuarioId,
      p_tipo: tipo,
      p_meta: meta,
    });

    if (error) {
      console.error('rpc_ponto_bater error', error);
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
    console.error('Unhandled /api/ponto/bater error', err);
    return NextResponse.json(
      { ok: false, error: String(err.message || err) },
      { status: 500 }
    );
  }
}
