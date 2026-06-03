// app/api/admin/colaboradores/get/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
try {
const url = new URL(req.url);
const id = url.searchParams.get('id');

if (!id) {
  return NextResponse.json(
    { ok: false, error: 'ID em falta' },
    { status: 400 },
  );
}

const supa = getServiceSupabase();

const { data, error } = await supa
  .from('colaboradores')
  .select(
    [
      'id',
      'empresa_id',
      'user_id',
      'codigo',
      'nome',
      'nif',
      'email',
      'telefone',
      'morada',
      'data_nasc',
      'funcao',
      'categoria',
      'tipo',
      'contrato_tipo',
      'salario_tipo',
      'salario_atual',
      'custo_hora',
      'iban',
      'data_admissao',
      'data_saida',
      'data_demissao',
      'notas',
      'ativo',
      'pode_aceder_sistema',
      'pode_registar_ponto',
      'exige_geo',
      'exige_foto',
    ].join(','),
  )
  .eq('id', id)
  .single();

if (error) {
  return NextResponse.json(
    { ok: false, error: error.message },
    { status: 400 },
  );
}

if (!data) {
  return NextResponse.json(
    { ok: false, error: 'Colaborador não encontrado' },
    { status: 404 },
  );
}

return NextResponse.json({ ok: true, record: data });

} catch (e: any) {
return NextResponse.json(
{ ok: false, error: e?.message || 'Erro inesperado' },
{ status: 500 },
);
}
}
