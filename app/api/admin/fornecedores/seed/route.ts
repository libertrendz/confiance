// app/api/admin/fornecedores/seed/route.ts
import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getServiceSupabase } from '@/lib/supabaseServer';

function clean(s: any): string | null {
  if (s === undefined || s === null) return null;
  let v = String(s).trim();
  if (!v) return null;
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1,-1).trim();
  v = v.replace(/^[“”‘’]|[“”‘’]$/g, '').trim();
  return v || null;
}

export async function POST() {
  try {
    const empresaId = clean(process.env.CONF_EMPRESA_ID);
    if (!empresaId) return NextResponse.json({ error: 'CONF_EMPRESA_ID em falta' }, { status: 400 });

    // Lê CSV versionado na pasta da API
    const csvPath = join(process.cwd(), 'app', 'api', 'admin', 'fornecedores', 'seed', 'fornecedores.csv');
    const csv = readFileSync(csvPath, 'utf8');
    const lines = csv.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (!lines.length) return NextResponse.json({ error: 'CSV vazio' }, { status: 400 });

    const header = lines[0].split(',').map(h => (clean(h)?.toLowerCase() || ''));
    const rows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      const obj: any = {};
      for (let c = 0; c < header.length; c++) obj[header[c] || `col_${c}`] = clean(cols[c]);
      rows.push(obj);
    }

    const supa = getServiceSupabase();
    const { data, error } = await supa.rpc('api_fornecedores_upsert_many', {
      p_empresa_id: empresaId,
      p_rows: rows
    });

    if (error) throw error;
    return NextResponse.json(data ?? { ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Seed falhou' }, { status: 500 });
  }
}
