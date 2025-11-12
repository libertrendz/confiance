// app/api/admin/fornecedores/seed/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

type Row = {
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
  concelho?: string | null;
  cod_postal?: string | null;
  codigo?: string | null;
  forma_pagamento?: string | null;
};

function parseCSV(txt: string): Row[] {
  const lines = txt.replace(/\r/g, '').split('\n').filter(Boolean);
  const headers = lines.shift()!.split(',').map(h => h.trim());
  return lines.map(l => {
    const cols = l.split(',').map(c => c.trim());
    const o: any = {};
    headers.forEach((h, i) => o[h] = cols[i] ?? null);
    return o as Row;
  });
}

export async function POST() {
  try {
    const supa = getServiceSupabase();

    const CSV_PATH = path.join(process.cwd(), 'app', 'data', 'fornecedores_oficial.csv');
    const buf = await readFile(CSV_PATH);
    const rows = parseCSV(buf.toString('utf8'));

    const empresaEnv = process.env.CONF_EMPRESA_ID || null;
    if (!empresaEnv) {
      return NextResponse.json({ ok: false, error: 'CONF_EMPRESA_ID ausente' }, { status: 500 });
    }

    // normalização + coerção
    const payloads = rows.map((r) => {
      const ativoBool =
        typeof r.ativo === 'string'
          ? ['1', 'true', 't', 'yes', 'sim'].includes(r.ativo.toLowerCase())
          : !!r.ativo;

      return {
        // id ignorado para garantir upsert por chaves funcionais
        empresa_id: empresaEnv,
        codigo: r.codigo || null,
        denominacao: r.denominacao || null,
        nif: r.nif || null,
        email: r.email || null,
        telefone: r.telefone || null,
        morada: r.morada || null,
        concelho: r.concelho || null,
        cod_postal: r.cod_postal || null,
        nome_contacto: r.nome_contacto || null,
        tipo_fornecimento: r.tipo_fornecimento || null,
        forma_pagamento: r.forma_pagamento || null,
        ativo: ativoBool,
      };
    });

    // upsert em lotes para não estourar payload
    const batchSize = 500;
    let created = 0, updated = 0, failed = 0;
    for (let i = 0; i < payloads.length; i += batchSize) {
      const chunk = payloads.slice(i, i + batchSize);

      // Preferência de conflito por (empresa_id, nif); se nif vier vazio, o Postgres não colide por NULL
      const { data, error } = await supa
        .from('fornecedores')
        .upsert(chunk, { onConflict: 'empresa_id,nif', ignoreDuplicates: false })
        .select();

      if (error) {
        failed += chunk.length;
      } else {
        // heurística: linhas retornadas contam como afetadas
        // não dá para distinguir created/updated via Supabase diretamente sem triggers
        created += data?.length ?? 0;
      }
    }

    return NextResponse.json({ ok: true, total: payloads.length, created, updated, failed });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
