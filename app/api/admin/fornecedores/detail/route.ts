import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

const UUID_RE = /^[0-9a-f-]{36}$/i;

export async function GET(req: Request) {
  try {
    const raw = process.env.CONF_EMPRESA_ID || '';
    const empresa_id = raw.trim();
    if (!/^[0-9a-f-]{36}$/i.test(empresa_id)) {
      return NextResponse.json({ ok: false, error: `CONF_EMPRESA_ID inválido` }, { status: 500 });
    }

    const url = new URL(req.url);
    const id = (url.searchParams.get('id') || '').trim();
    if (!UUID_RE.test(id)) return NextResponse.json({ ok: false, error: 'ID inválido' }, { status: 400 });

    const supa = getServiceSupabase();
    const { data, error } = await supa
      .from('fornecedores')
      .select('*')
      .eq('empresa_id', empresa_id)
      .eq('id', id)
      .maybeSingle();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ ok: false, error: 'Não encontrado' }, { status: 404 });

    return NextResponse.json({ ok: true, row: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Erro inesperado' }, { status: 500 });
  }
}
