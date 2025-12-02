// app/api/ponto/bater/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;
const API_ADMIN_SECRET = process.env.API_ADMIN_SECRET;

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null) || {};
    const usuarioId = body.usuarioId;
    const tipo = body.tipo;
    const meta = body.meta ?? {};

    if (!usuarioId || !tipo) {
      return NextResponse.json({ ok: false, error: 'Missing usuarioId or tipo' }, { status: 400 });
    }

    // Supabase admin client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
      auth: { persistSession: false }
    });

    // Chama a RPC que usa empresa_id via JWT (injetado pelo middleware)
    const { data, error } = await supabase.rpc('rpc_ponto_bater', {
      p_usuario_id: usuarioId,
      p_tipo: tipo,
      p_meta: meta
    });

    if (error) {
      console.error('rpc_ponto_bater error', error);
      return NextResponse.json({ ok: false, error: String(error.message || error) }, { status: 500 });
    }

    return NextResponse.json({ ok: true, result: data }, { status: 200 });

  } catch (err: any) {
    console.error('ponto/bater error', err);
    return NextResponse.json({ ok: false, error: String(err.message || err) }, { status: 500 });
  }
}
