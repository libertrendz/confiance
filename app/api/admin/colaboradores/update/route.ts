// app/api/admin/colaboradores/update/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Body = {
  id?: string;
  nome?: string;
  nif?: string | null;
  email?: string | null;
  telefone?: string | null;
  tipo?: string | null;
  custo_hora?: number | null;
  categoria?: string | null;
  contrato_tipo?: string | null;
  iban?: string | null;
  data_admissao?: string | null;
  ativo?: boolean;
};

function cleanString(v: any): string | null {
  const s = String(v ?? '').trim();
  return s === '' ? null : s;
}

function onlyDigits(v: string | null): string | null {
  if (!v) return null;
  return v.replace(/\D/g, '') || null;
}

export async function POST(req: Request) {
  try {
    const empresaId = process.env.CONF_EMPRESA_ID;
    if (!empresaId) {
      return NextResponse.json({ ok: false, error: 'CONF_EMPRESA_ID em falta' }, { status: 500 });
    }

    const raw: Body = await req.json().catch(() => ({} as Body));
    const id = cleanString(raw.id);

    if (!id) {
      return NextResponse.json({ ok: false, error: 'ID em falta' }, { status: 400 });
    }

    const nome = cleanString(raw.nome);
    const nif = onlyDigits(cleanString(raw.nif));
    const email = cleanString(raw.email);
    const telefone = onlyDigits(cleanString(raw.telefone));
    const tipo = cleanString(raw.tipo);
    const data_admissao = cleanString(raw.data_admissao);
    const custo_hora =
      raw.custo_hora === null || raw.custo_hora === undefined
        ? null
        : Number(raw.custo_hora);
    const categoria = cleanString(raw.categoria);
    const contrato_tipo = cleanString(raw.contrato_tipo);
    const iban = cleanString(raw.iban);
    const ativo = raw.ativo ?? true;

    if (nif && !/^[0-9]{9}$/.test(nif)) {
      return NextResponse.json({ ok: false, error: 'NIF deve ter 9 dígitos' }, { status: 400 });
    }

    if (telefone && !/^[0-9]{9}$/.test(telefone)) {
      return NextResponse.json({ ok: false, error: 'Telefone deve ter 9 dígitos' }, { status: 400 });
    }

    if (email && !/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email)) {
      return NextResponse.json({ ok: false, error: 'Email inválido' }, { status: 400 });
    }

    const supa = getServiceSupabase();

    const { error } = await supa
      .from('colaboradores')
      .update({
        nome,
        nif,
        email,
        telefone,
        tipo,
        custo_hora,
        categoria,
        contrato_tipo,
        iban,
        data_admissao: data_admissao ?? null,
        ativo,
      })
      .eq('id', id)
      .eq('empresa_id', empresaId);

    if (error) {
      return NextResponse.json(
        { ok: false, error: `Erro ao atualizar colaborador: ${error.message}` },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Erro inesperado ao atualizar colaborador' },
      { status: 500 },
    );
  }
}
