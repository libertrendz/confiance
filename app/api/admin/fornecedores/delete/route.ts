import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

const UUID_RE = /^[0-9a-f-]{36}$/i;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = String(body?.id || body?.user_id || '').trim();
    if (!UUID_RE.test(id)) return NextResponse.json({ ok: false, error: 'ID inválido' }, { status: 400 });

    const raw = process.env.CONF_EMPRESA_ID || '';
    const empresa_id = raw.trim();
    if (!UUID_RE.test(empresa_id)) {
      return NextResponse.json({ ok: false, error: `CONF_EMPRESA_ID inválido` }, { status: 500 });
    }

    const supa = getServiceSupabase();
    const { error } = await supa
      .from('fornecedores')
      .delete()
      .eq('empresa_id', empresa_id)
      .eq('id', id);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Erro inesperado' }, { status: 500 });
  }
}
