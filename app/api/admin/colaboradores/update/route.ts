/**

* ============================================================
* CONFIANCE ERP
* Arquivo: app/api/admin/colaboradores/update/route.ts
* Módulo: Colaboradores
* Endpoint: Atualizar Colaborador
*
* Objetivo:
* Atualizar dados cadastrais, contratuais e operacionais.
*
* RH-003.5
* * salario_tipo (horista | mensalista)
* * salario_atual
* * custo_hora condicionado
* * data_saida
*
* Autor: Libertrendz
* ============================================================
  */

import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
try {
const body = await req.json().catch(() => ({}));

const id = String(body?.id || '').trim();

if (!id) {
  return NextResponse.json(
    { ok: false, error: 'ID obrigatório' },
    { status: 400 },
  );
}

const nome = body?.nome ? String(body.nome).trim() : null;
const nif = body?.nif ? String(body.nif).trim() : null;
const email = body?.email ? String(body.email).trim() : null;
const telefone = body?.telefone ? String(body.telefone).trim() : null;

const morada =
  body?.morada ? String(body.morada).trim() : null;

const data_nasc =
  body?.data_nasc &&
  String(body.data_nasc).trim() !== ''
    ? String(body.data_nasc)
    : null;

const notas =
  body?.notas ? String(body.notas).trim() : null;

const tipo =
  body?.tipo ? String(body.tipo).trim() : null;

const funcao =
  body?.funcao ? String(body.funcao).trim() : null;

const categoria =
  body?.categoria
    ? String(body.categoria).trim()
    : null;

const contrato_tipo =
  body?.contrato_tipo
    ? String(body.contrato_tipo).trim()
    : null;

const salario_tipo =
  body?.salario_tipo
    ? String(body.salario_tipo).trim()
    : null;

const salario_atual =
  body?.salario_atual === null ||
  body?.salario_atual === ''
    ? null
    : Number(body.salario_atual);

let custo_hora =
  body?.custo_hora === null ||
  body?.custo_hora === ''
    ? null
    : Number(body.custo_hora);

let salarioAtualFinal = salario_atual;

if (salario_tipo === 'horista') {
  salarioAtualFinal = null;
}

if (salario_tipo === 'mensalista') {
  custo_hora = null;
}

const iban =
  body?.iban ? String(body.iban).trim() : null;

const data_admissao =
  body?.data_admissao &&
  String(body.data_admissao).trim() !== ''
    ? String(body.data_admissao)
    : null;

const data_saida =
  body?.data_saida &&
  String(body.data_saida).trim() !== ''
    ? String(body.data_saida)
    : null;

const ativo =
  body?.ativo === false ? false : true;

const pode_aceder_sistema =
  body?.pode_aceder_sistema === true;

const pode_registar_ponto =
  body?.pode_registar_ponto === true;

const supa = getServiceSupabase();

const { error } = await supa
  .from('colaboradores')
  .update({
    nome,
    nif,
    email,
    telefone,

    morada,
    data_nasc,

    tipo,
    funcao,
    categoria,
    contrato_tipo,

    salario_tipo,
    salario_atual: salarioAtualFinal,
    custo_hora,

    iban,

    data_admissao,
    data_saida,

    notas,

    ativo,

    pode_aceder_sistema,
    pode_registar_ponto,
  })
  .eq('id', id);

if (error) {
  return NextResponse.json(
    { ok: false, error: error.message },
    { status: 400 },
  );
}

return NextResponse.json({
  ok: true,
});

} catch (e: any) {
return NextResponse.json(
{
ok: false,
error: e?.message || 'Erro inesperado',
},
{ status: 500 },
);
}
}
