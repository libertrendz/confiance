// app/api/admin/colaboradores/delete/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const empresaId = process.env.CONF_EMPRESA_ID;
    if (!empresaId) {
      return NextResponse.json({ ok: false, error: 'CONF_EMPRESA_ID em falta' }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const id = String(body?.id || '').trim();

    if (!id) {
      return NextResponse.json({ ok: false, error: 'ID em falta' }, { status: 400 });
    }

    const supa = getServiceSupabase();

    const { error } = await supa
      .from('colaboradores')
      .delete()
      .eq('id', id)
      .eq('empresa_id', empresaId);

    if (error) {
      return NextResponse.json(
        { ok: false, error: `Erro ao eliminar colaborador: ${error.message}` },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Erro inesperado ao eliminar colaborador' },
      { status: 500 },
    );
  }
}
