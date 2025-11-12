// app/api/admin/fornecedores/seed/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';
import fs from 'node:fs/promises';
import path from 'node:path';

type Row = {
  denominacao: string;
  nif?: string | null;
  email?: string | null;
  telefone?: string | null;
  morada?: string | null;
  cod_postal?: string | null;
  cidade?: string | null;
  pais?: string | null;
  observacoes?: string | null;
  forma_pagamento?: string | null;
  ativo?: string | boolean | null;
};

function parseCSV(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (!lines.length) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const cols = line.split(',');
    const rec: any = {};
    headers.forEach((h, i) => rec[h] = (cols[i] ?? '').trim());
    rec.denominacao = rec.denominacao || null;
    rec.nif = rec.nif || null;
    rec.email = rec.email || null;
    rec.telefone = rec.telefone || null;
    rec.morada = rec.morada || null;
    rec.cod_postal = rec.cod_postal || null;
    rec.cidade = rec.cidade || null;
    rec.pais = rec.pais || null;
    rec.observacoes = rec.observacoes || null;
    rec.forma_pagamento = rec.forma_pagamento || null;
    const a = String(rec.ativo ?? '').toLowerCase();
    rec.ativo = a === 'true' || a === '1' || a === 'sim' || a === 'yes' || a === 'y' ? true : true;
    return rec as Row;
  });
}

export async function POST() {
  try {
    const file = path.join(process.cwd(), 'seed', 'fornecedores.csv');
    const csv = await fs.readFile(file, 'utf8');
    const rows = parseCSV(csv);
    if (!rows.length) {
      return NextResponse.json({ ok: false, error: 'CSV vazio' }, { status: 400 });
    }

    const empresa_id = process.env.CONF_EMPRESA_ID;
    if (!empresa_id) {
      return NextResponse.json({ ok: false, error: 'CONF_EMPRESA_ID ausente' }, { status: 400 });
    }

    const supa = getServiceSupabase();

    const chunkSize = 500;
    let created = 0, updated = 0;

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize)
        .filter(r => r.denominacao && String(r.denominacao).trim().length > 0)
        .map(r => ({
          empresa_id,
          denominacao: r.denominacao.trim(),
          nif: r.nif || null,
          email: r.email || null,
          telefone: r.telefone || null,
          morada: r.morada || null,
          cod_postal: r.cod_postal || null,
          cidade: r.cidade || null,
          pais: r.pais || null,
          observacoes: r.observacoes || null,
          forma_pagamento: r.forma_pagamento || null,
          ativo: typeof r.ativo === 'boolean' ? r.ativo : true,
        }));

      if (!chunk.length) continue;

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
