// app/api/admin/fornecedores/seed/route.ts
import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getServiceSupabase } from '@/lib/supabaseServer';

type Row = {
  id?: string | null;
  empresa_id?: string | null;         // ignorado, forçamos ENV
  nif?: string | null;
  email?: string | null;
  telefone?: string | null;
  morada?: string | null;
  ativo?: string | null;
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function clean(s: any): string | null {
  if (s === undefined || s === null) return null;
  let v = String(s).trim();
  if (!v) return null;
  // tira aspas comuns ou “inteligentes”
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1,-1).trim();
  v = v.replace(/^[“”‘’]|[“”‘’]$/g, '').trim();
  return v || null;
}

export async function POST() {
  try {
    const empresaEnv = clean(process.env.CONF_EMPRESA_ID);
    if (!empresaEnv || !UUID_RE.test(empresaEnv)) {
      return NextResponse.json({ error: 'CONF_EMPRESA_ID inválido (UUID sem aspas).' }, { status: 400 });
    }

    // 2.1) Seta JWT na sessão para satisfazer triggers/RLS que consultam request.jwt.claims
    const supa = getServiceSupabase();
    const { error: jwtErr } = await supa.rpc('api_set_jwt', { p_empresa_id: empresaEnv });
    if (jwtErr) {
      return NextResponse.json({ error: `Falha ao setar JWT de sessão: ${jwtErr.message}` }, { status: 500 });
    }

    // 2.2) Lê o CSV versionado
    const csvPath = join(process.cwd(), 'app', 'api', 'admin', 'fornecedores', 'seed', 'fornecedores.csv');
    const csvText = readFileSync(csvPath, 'utf8');

    const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (!lines.length) return NextResponse.json({ error: 'CSV vazio.' }, { status: 400 });

    const header = lines[0].split(',').map(h => clean(h)?.toLowerCase() || '');
    const rows: Row[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      const obj: any = {};
      for (let c = 0; c < header.length; c++) obj[header[c] || `col_${c}`] = clean(cols[c]);
      rows.push(obj);
    }

    const payload = rows.map(r => {
      let ativo: boolean | null = null;
      const a = (r.ativo || '')?.toLowerCase();
      if (['true','1','t','sim','yes'].includes(a)) ativo = true;
      else if (['false','0','f','nao','não','no'].includes(a)) ativo = false;

      return {
        id: r.id && UUID_RE.test(r.id) ? r.id : null,
        empresa_id: empresaEnv,                 // força ENV
        nif: r.nif || null,
        email: r.email || null,
        telefone: r.telefone || null,
        morada: r.morada || null,
        ativo: ativo ?? true,
        created_at: null,
        updated_at: null,
        denominacao: r.denominacao || null,
        nome_contacto: r.nome_contacto || null,
        tipo_fornecimento: r.tipo_fornecimento || null,
        concelho: r.concelho || null,
        cod_postal: r.cod_postal || null,
        codigo: r.codigo || null,
        forma_pagamento: r.forma_pagamento || null,
      };
    }).filter(p => p.denominacao || p.nif);

    if (!payload.length) return NextResponse.json({ error: 'Nenhuma linha útil após normalização.' }, { status: 400 });

    // 2.3) Upsert com chaves certas
    // Por NIF
    const byNif = payload.filter(x => x.nif);
    if (byNif.length) {
      const { error: u1 } = await supa
        .from('fornecedores')
        .upsert(byNif, { onConflict: 'empresa_id,nif', ignoreDuplicates: false })
        .select('id')
        .limit(1);
      if (u1) throw u1;
    }
    // Fallback por denominação quando não há NIF
    const byDen = payload.filter(x => !x.nif && x.denominacao);
    if (byDen.length) {
      const { error: u2 } = await supa
        .from('fornecedores')
        .upsert(byDen, { onConflict: 'empresa_id,denominacao', ignoreDuplicates: false })
        .select('id')
        .limit(1);
      if (u2) throw u2;
    }

    return NextResponse.json({ ok: true, total: payload.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Seed falhou' }, { status: 500 });
  }
}
