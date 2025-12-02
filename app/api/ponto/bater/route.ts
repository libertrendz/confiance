// app/api/ponto/bater/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;
const API_ADMIN_SECRET = process.env.API_ADMIN_SECRET;

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: { Allow: 'POST, OPTIONS' }});
}

export async function POST(req: Request) {
  try {
    const provided = req.headers.get('x-admin-secret');
    if (API_ADMIN_SECRET && provided !== API_ADMIN_SECRET) {
      return NextResponse.json({ ok:false, error:'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(()=>null) || {};
    const usuarioId = body.usuarioId;
    const tipo = body.tipo;
    const meta = body.meta ?? {};
    const empresaId = body.empresaId ?? null;

    if (!usuarioId || !tipo) {
      return NextResponse.json({ ok:false, error:'Missing usuarioId or tipo' }, { status:400 });
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      console.error('Missing SUPABASE envs');
      return NextResponse.json({ ok:false, error:'Server misconfigured' }, { status:500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });

    const { data, error } = await supabase.rpc('rpc_ponto_bater', {
      p_empresa_id: empresaId,
      p_usuario_id: usuarioId,
      p_tipo: tipo,
      p_meta: meta
    });

    if (error) {
      console.error('rpc_ponto_bater error', error);
      return NextResponse.json({ ok:false, error: String(error.message ?? error) }, { status:500 });
    }

    return NextResponse.json({ ok:true, result: data }, { status:200 });
  } catch (err:any) {
    console.error('Unhandled ponto/bater', err);
    return NextResponse.json({ ok:false, error: String(err.message||err) }, { status:500 });
  }
}