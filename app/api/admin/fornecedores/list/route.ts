// app/api/admin/fornecedores/list/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.trim() || '';
    const page = Number(url.searchParams.get('page') || 1);
    const pageSize = Math.min(Number(url.searchParams.get('pageSize') || 20), 100);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const supa = getServiceSupabase();
    let query = supa.from('v_fornecedores_list').select('*', { count: 'exact' });
    if (q) query = query.ilike('denominacao', `%${q}%`);
    const { data, error, count } = await query.range(from, to);
    if (error) throw error;

    return NextResponse.json({ rows: data ?? [], count: count ?? 0, page, pageSize });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Falha ao listar' }, { status: 500 });
  }
}
