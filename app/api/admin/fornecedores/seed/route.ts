// app/api/admin/fornecedores/seed/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';
import fs from 'node:fs/promises';
import path from 'node:path';

type CsvRow = {
  id?: string | null;
  empresa_id?: string | null;
  nif?: string | null;
  email?: string | null;
  telefone?: string | null;
  morada?: string | null;
  ativo?: string | boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  denominacao?: string | null;
  nome_contacto?: string | null;
  tipo_fornecimento?: string | null;
  concelho?: string | null;         // será mapeado para cidade
  cod_postal?: string | null;
  codigo?: string | null;           // ignorado
  forma_pagamento?: string | null;
};

type FornecedorUpsert = {
  empresa_id: string;
  denominacao: string;
  nif: string | null;
  email: string | null;
  telefone: string | null;
  morada: string | null;
  cod_postal: string | null;
  cidade: string | null;
  pais: string | null;
  observacoes: string | null;
  forma_pagamento: string | null;
  ativo: boolean;
};

function toBool(v: any): boolean {
  const s = String(v ?? '').trim().toLowerCase();
  if (!s) return true; // default true
  return ['true','1','sim','yes','y','ativo'].includes(s);
}

// CSV tosco: espera vírgula como separador e sem vírgulas dentro dos campos.
// Se o teu arquivo tiver vírgulas dentro de valores, avisa que eu troco por um parser mais robusto.
function parseCSV(text: string): { headers: string[]; rows: Record<string,string>[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (!lines.length) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const cols = line.split(',');
    const rec: Record<string,string> = {};
    headers.forEach((h, i) => rec[h] = (cols[i] ?? '').trim());
    return rec;
  });
  return { headers, rows };
}

function mapRow(rec: Record<string,string>, empresa_id_env: string): FornecedorUpsert | null {
  // Campos do cabeçalho informado por ti:
  // id,empresa_id,nif,email,telefone,morada,ativo,created_at,updated_at,denominacao,
  // nome_contacto,tipo_fornecimento,concelho,cod_postal,codigo,forma_pagamento

  const denominacao = (rec['denominacao'] || '').trim();
  if (!denominacao) return null;

  const nif          = (rec['nif'] || '').trim() || null;
  const email        = (rec['email'] || '').trim() || null;
  const telefone     = (rec['telefone'] || '').trim() || null;
  const morada       = (rec['morada'] || '').trim() || null;
  const cod_postal   = (rec['cod_postal'] || '').trim() || null;
  const cidade       = (rec['concelho'] || '').trim() || null; // mapeado
  const forma_pg     = (rec['forma_pagamento'] || '').trim() || null;
  const ativo        = toBool(rec['ativo']);
  // país não veio no CSV; deixa null (ou fixa 'PT' se quiser forçar)
  const pais: string | null = null;

  // Campos extras que não temos coluna dedicada: nome_contacto, tipo_fornecimento, codigo
  const extras: string[] = [];
  if ((rec['nome_contacto'] || '').trim())     extras.push(`Contato: ${rec['nome_contacto'].trim()}`);
  if ((rec['tipo_fornecimento'] || '').trim()) extras.push(`Tipo: ${rec['tipo_fornecimento'].trim()}`);
  if ((rec['codigo'] || '').trim())            extras.push(`Código: ${rec['codigo'].trim()}`);
  const observacoes = extras.length ? extras.join(' | ') : null;

  return {
    empresa_id: empresa_id_env,
    denominacao,
    nif,
    email,
    telefone,
    morada,
    cod_postal,
    cidade,
    pais,
    observacoes,
    forma_pagamento: forma_pg,
    ativo,
  };
}

export async function POST() {
  try {
    const empresa_id = process.env.CONF_EMPRESA_ID;
    if (!empresa_id) {
      return NextResponse.json({ ok: false, error: 'CONF_EMPRESA_ID ausente' }, { status: 400 });
    }

    // CSV esperado em /seed/fornecedores.csv
    const file = path.join(process.cwd(), 'seed', 'fornecedores.csv');
    const csv = await fs.readFile(file, 'utf8');
    const { rows } = parseCSV(csv);
    if (!rows.length) {
      return NextResponse.json({ ok: false, error: 'CSV vazio' }, { status: 400 });
    }

    const supa = getServiceSupabase();

    // Prepara lote
    const mapped: FornecedorUpsert[] = [];
    for (const r of rows) {
      const m = mapRow(r, empresa_id);
      if (m) mapped.push(m);
    }
    if (!mapped.length) {
      return NextResponse.json({ ok: false, error: 'Sem linhas válidas (denominacao vazia)' }, { status: 400 });
    }

    // Upsert em 2 grupos: com NIF e sem NIF
    const chunkSize = 500;
    let created = 0, updated = 0;

    for (let i = 0; i < mapped.length; i += chunkSize) {
      const chunk = mapped.slice(i, i + chunkSize);

      const withNif = chunk.filter(c => !!c.nif);
      if (withNif.length) {
        const { data, error } = await supa
          .from('fornecedores')
          .upsert(withNif, { onConflict: 'empresa_id,nif' })
          .select('id, created_at');
        if (error) throw error;
        data?.forEach(d => d.created_at ? created++ : updated++);
      }

      const withoutNif = chunk.filter(c => !c.nif);
      if (withoutNif.length) {
        const { data, error } = await supa
          .from('fornecedores')
          .upsert(withoutNif, { onConflict: 'empresa_id,denominacao' })
          .select('id, created_at');
        if (error) throw error;
        data?.forEach(d => d.created_at ? created++ : updated++);
      }
    }

    return NextResponse.json({ ok: true, created, updated });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'seed_failed' }, { status: 500 });
  }
}
