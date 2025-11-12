import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: Request) {
  try {
    const raw = process.env.CONF_EMPRESA_ID || '';
    const empresa_id = raw.trim();
    if (!UUID_RE.test(empresa_id)) {
      return NextResponse.json({ ok: false, error: `CONF_EMPRESA_ID inválido: "${raw}"` }, { status: 500 });
    }

    const url = new URL(req.url);
    const q = (url.searchParams.get('q') || '').trim();

    const supa = getServiceSupabase();
    let query = supa
      .from('fornecedores')
      .select('id,codigo,denominacao,nif,telefone,email,ativo')
      .eq('empresa_id', empresa_id);

    if (q) {
      // busca simples por ILIKE em campos principais
      query = query.or(`denominacao.ilike.%${q}%,nif.ilike.%${q}%,telefone.ilike.%${q}%,email.ilike.%${q}%`);
    }

    const { data, error } = await query.order('codigo', { ascending: true });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, rows: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Erro inesperado' }, { status: 500 });
  }
}
