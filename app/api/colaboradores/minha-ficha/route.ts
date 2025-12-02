// app/api/colaboradores/minha-ficha/route.ts
//
// Retorna a "ficha" do colaborador ligada a um user (Auth)
// usando a view v_colaboradores_perfis.
//
// Entrada (JSON):
//   {
//     "usuarioId": "uuid-do-auth.users",
//     "empresaId": "uuid-da-empresa"
//   }
//
// Saída (200):
//   { ok: true, colaborador: { ...linha da view... } }
//
// Saída (404):
//   { ok: false, error: "Colaborador não encontrado" }
//
// Saída (400/500): erro de input ou servidor.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

export async function POST(req: Request) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      console.error('Missing SUPABASE envs for /api/colaboradores/minha-ficha');
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured' },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { ok: false, error: 'Invalid body' },
        { status: 400 }
      );
    }

    const usuarioId = body.usuarioId as string | undefined;
    const empresaId = body.empresaId as string | undefined;

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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from('v_colaboradores_perfis')
      .select('*')
      .eq('user_id', usuarioId)
      .eq('empresa_id', empresaId)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('minha-ficha query error', error);
      return NextResponse.json(
        { ok: false, error: String(error.message || error) },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { ok: false, error: 'Colaborador não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { ok: true, colaborador: data },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('minha-ficha unhandled error', err);
    return NextResponse.json(
      { ok: false, error: String(err.message || err) },
      { status: 500 }
    );
  }
}
