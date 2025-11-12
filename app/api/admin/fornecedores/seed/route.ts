// app/api/admin/fornecedores/seed/route.ts
import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getServiceSupabase } from '@/lib/supabaseServer';

type Row = {
  id?: string | null;
  empresa_id?: string | null;         // será ignorado
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
  // remove aspas envolventes comuns
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim();
  }
  // remove aspas “inteligentes”
  v = v.replace(/^[“”‘’]|[“”‘’]$/g, '').trim();
  if (!v) return null;
  return v;
}

export async function POST() {
  try {
    const empresaEnv = clean(process.env.CONF_EMPRESA_ID);
    if (!empresaEnv || !UUID_RE.test(empresaEnv)) {
      return NextResponse.json({ error: 'CONF_EMPRESA_ID inválido ou ausente (precisa ser UUID sem aspas).' }, { status: 400 });
    }

    // Lê o CSV “embarcado” no repositório
    const csvPath = join(process.cwd(), 'app', 'api', 'admin', 'fornecedores', 'seed', 'fornecedores.csv');
    const csvText = readFileSync(csvPath, 'utf8');

    // Parser CSV simples (aceita vírgula como separador; cabeçalho obrigatório)
    const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (!lines.length) {
      return NextResponse.json({ error: 'CSV vazio.' }, { status: 400 });
    }

    const header = lines[0].split(',').map(h => clean(h)?.toLowerCase() || '');
    const rows: Row[] = [];
    for (let i = 1; i < lines.length; i++) {
      const raw = lines[i];
      // split básico; se teu CSV tiver vírgulas dentro de aspas, depois melhoramos com um parser, por ora resolvemos o bug crítico
      const cols = raw.split(',');
      const obj: any = {};
      for (let c = 0; c < header.length; c++) {
        const key = header[c] || `col_${c}`;
        obj[key] = clean(cols[c]);
      }
      rows.push(obj);
    }

    // Normaliza para upsert: ignora empresa_id do CSV, força o do ENV, limpa boolean e datas
    const payload = rows.map(r => {
      // ativo: true/false
      let ativo: boolean | null = null;
      const a = (r.ativo || '')?.toLowerCase();
      if (a === 'true' || a === '1' || a === 't' || a === 'sim' || a === 'yes') ativo = true;
      else if (a === 'false' || a === '0' || a === 'f' || a === 'nao' || a === 'não' || a === 'no') ativo = false;

      return {
        // id e empresa_id da linha são ignorados; id só se for UUID válido
        id: r.id && UUID_RE.test(r.id) ? r.id : null,
        empresa_id: empresaEnv,
        nif: r.nif || null,
        email: r.email || null,
        telefone: r.telefone || null,
        morada: r.morada || null,
        ativo: ativo ?? true,
        // created_at / updated_at: deixamos para defaults/trigger; só passa se tiver valor plausível
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
    });

    // Remove linhas completamente vazias (denominacao e nif nulos)
    const toUpsert = payload.filter(p => (p.denominacao && p.denominacao.length > 0) || (p.nif && p.nif.length > 0));
    if (!toUpsert.length) {
      return NextResponse.json({ error: 'Nenhuma linha útil após normalização.' }, { status: 400 });
    }

    const supa = getServiceSupabase();

    // Primeiro, UPDATE quando já existir por (empresa_id, nif) OU fallback (empresa_id, denominacao)
    // Fase 1: update por NIF
    const byNif = toUpsert.filter(x => x.nif);
    if (byNif.length) {
      const { error: u1 } = await supa
        .from('fornecedores')
        .upsert(byNif, { onConflict: 'empresa_id,nif', ignoreDuplicates: false })
        .select('id')
        .limit(1); // força execução
      if (u1) throw u1;
    }

    // Fase 2: update por denominacao quando NIF faltar
    const byDen = toUpsert.filter(x => !x.nif && x.denominacao);
    if (byDen.length) {
      const { error: u2 } = await supa
        .from('fornecedores')
        .upsert(byDen, { onConflict: 'empresa_id,denominacao', ignoreDuplicates: false })
        .select('id')
        .limit(1);
      if (u2) throw u2;
    }

    return NextResponse.json({ ok: true, total: toUpsert.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Seed falhou' }, { status: 500 });
  }
}
