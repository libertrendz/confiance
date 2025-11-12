// app/api/admin/fornecedores/delete/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ ok:false, error:'id em falta' }, { status:400 });

    const supa = getServiceSupabase();
    const { error } = await supa.from('fornecedores').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ ok:true });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:e?.message || 'Falha ao eliminar' }, { status:500 });
  }
}
