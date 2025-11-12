// app/api/admin/fornecedores/list/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET() {
  try {
    const raw = process.env.CONF_EMPRESA_ID || '';
    const empresa_id = raw.trim();

    if (!UUID_RE.test(empresa_id)) {
      return NextResponse.json(
        { ok: false, error: `CONF_EMPRESA_ID inválido: "${raw}"` },
        { status: 500 }
      );
    }

    const supa = getServiceSupabase();
    const { data, error } = await supa
      .from('fornecedores') // TABELA direta, não usa view nenhuma
      .select('id,codigo,denominacao,nif,telefone,email,ativo')
      .eq('empresa_id', empresa_id)
      .order('codigo', { ascending: true });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, rows: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Erro inesperado' }, { status: 500 });
  }
}
