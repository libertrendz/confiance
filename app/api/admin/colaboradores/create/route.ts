// app/api/admin/colaboradores/create/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Body = {
  nome?: string;
  nif?: string | null;
  email?: string | null;
  telefone?: string | null;
  tipo?: string | null;          // 'empregado' | 'externo' no futuro
  custo_hora?: number | null;
  data_admissao?: string | null; // ISO date
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
    const ativo = raw.ativo ?? true;

    if (!nome) {
      return NextResponse.json({ ok: false, error: 'Nome é obrigatório' }, { status: 400 });
    }

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

    const { data, error } = await supa
      .from('colaboradores')
      .insert({
        empresa_id: empresaId,
        nome,
        nif,
        email,
        telefone,
        tipo,
        custo_hora,
        data_admissao: data_admissao ?? null,
        ativo,
      })
      .select('id')
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: `Erro ao criar colaborador: ${error.message}` },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true, id: data?.id });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Erro inesperado ao criar colaborador' },
      { status: 500 },
    );
  }
}
