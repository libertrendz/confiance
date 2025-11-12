// app/api/admin/fornecedores/delete/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID em falta' }, { status: 400 });

    const supa = getServiceSupabase();
    const empresa_id = process.env.CONF_EMPRESA_ID!;
    if (!empresa_id) return NextResponse.json({ error: 'Empresa não configurada' }, { status: 500 });

    const { error } = await supa
      .from('fornecedores')
      .delete()
      .eq('id', id)
      .eq('empresa_id', empresa_id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Falha ao eliminar' }, { status: 500 });
  }
}
