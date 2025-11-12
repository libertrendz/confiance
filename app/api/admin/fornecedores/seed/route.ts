// app/api/admin/fornecedores/seed/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';
import fs from 'node:fs';
import path from 'node:path';

export async function POST() {
  try {
    const supa = getServiceSupabase();
    const empresa_id = process.env.CONF_EMPRESA_ID;
    if (!empresa_id) {
      return NextResponse.json({ ok: false, error: 'CONF_EMPRESA_ID ausente' }, { status: 500 });
    }

    const csvPath = path.join(process.cwd(), 'app', 'api', 'admin', 'fornecedores', 'seed', 'fornecedores.csv');
    const raw = fs.readFileSync(csvPath, 'utf-8');

    // Cabeçalho esperado:
    // id,empresa_id,nif,email,telefone,morada,ativo,created_at,updated_at,denominacao,nome_contacto,tipo_fornecimento,concelho,cod_postal,codigo,forma_pagamento
    const lines = raw.split(/\r?\n/).filter(l => l.trim().length);
    const header = lines.shift()!;
    const cols = header.split(',').map(s => s.trim());
    const need = ['id','empresa_id','nif','email','telefone','morada','ativo','created_at','updated_at','denominacao','nome_contacto','tipo_fornecimento','concelho','cod_postal','codigo','forma_pagamento'];
    for (const c of need) {
      if (!cols.includes(c)) {
        return NextResponse.json({ ok: false, error: `CSV sem coluna: ${c}` }, { status: 400 });
      }
    }

    const idx = Object.fromEntries(cols.map((c,i)=>[c,i]));
    const rows = lines.map(l => l.split(',')).filter(r => r.length >= cols.length);

    let inserted = 0, updated = 0, skipped = 0;

    for (const r of rows) {
      const payload = {
        id: r[idx.id] || null,
        empresa_id,
        nif: r[idx.nif] || null,
        email: r[idx.email] || null,
        telefone: r[idx.telefone] || null,
        morada: r[idx.morada] || null,
        ativo: (r[idx.ativo] || '').toLowerCase() === 'true',
        denominacao: r[idx.denominacao] || null,
        nome_contacto: r[idx.nome_contacto] || null,
        tipo_fornecimento: r[idx.tipo_fornecimento] || null,
        concelho: r[idx.concelho] || null,
        cod_postal: r[idx.cod_postal] || null,
        codigo: r[idx.codigo] || null,
        forma_pagamento: r[idx.forma_pagamento] || null,
      };

      // upsert por (empresa_id, nif) se houver nif; senão (empresa_id, denominacao)
      const keyFilter = payload.nif
        ? { empresa_id, nif: payload.nif }
        : { empresa_id, denominacao: payload.denominacao };

      if (!('nif' in keyFilter) && !payload.denominacao) {
        skipped++;
        continue;
      }

      const { data: existing, error: selErr } = await supa
        .from('fornecedores')
        .select('id')
        .match(keyFilter as any)
        .limit(1)
        .maybeSingle();

      if (selErr) throw selErr;

      if (existing?.id) {
        const { error: updErr } = await supa
          .from('fornecedores')
          .update(payload as any)
          .eq('id', existing.id);
        if (updErr) throw updErr;
        updated++;
      } else {
        const { error: insErr } = await supa
          .from('fornecedores')
          .insert({ ...payload, created_at: new Date().toISOString() } as any);
        if (insErr) throw insErr;
        inserted++;
      }
    }

    return NextResponse.json({ ok: true, inserted, updated, skipped });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'erro' }, { status: 500 });
  }
}
