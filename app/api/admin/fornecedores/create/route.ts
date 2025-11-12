import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

const UUID_RE = /^[0-9a-f-]{36}$/i;

export async function POST(req: Request) {
  try {
    const raw = process.env.CONF_EMPRESA_ID || '';
    const empresa_id = raw.trim();
    if (!UUID_RE.test(empresa_id)) {
      return NextResponse.json({ ok: false, error: `CONF_EMPRESA_ID inválido` }, { status: 500 });
    }

    const body = await req.json();
    const denominacao = String(body?.denominacao || '').trim();
    const nif = String(body?.nif || '').trim() || null;
    const email = String(body?.email || '').trim() || null;
    const telefone = String(body?.telefone || '').trim() || null;

    if (!denominacao) return NextResponse.json({ ok: false, error: 'Denominação obrigatória' }, { status: 400 });

    const supa = getServiceSupabase();
    // código é gerado por trigger/seq no DB (já tens isso). Se não tiver, dá para gerar via RPC.
    const { data, error } = await supa
      .from('fornecedores')
      .insert([{ empresa_id, denominacao, nif, email, telefone, ativo: true }])
      .select('id')
      .single();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, id: data?.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Erro inesperado' }, { status: 500 });
  }
}
