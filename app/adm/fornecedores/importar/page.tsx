'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Papa from 'papaparse';
import getBrowserSupabase from '@/lib/supa';

type Row = {
  denominacao?: string;
  nif?: string;
  email?: string;
  telefone?: string;
  morada?: string;
  cidade?: string;
  cod_postal?: string;
  observacoes?: string;
};

export default function ImportarFornecedoresPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setRows([]);
    setMsg(null);
    setErr(null);
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (res) => {
        const data = (res.data ?? []).map((r) => ({
          denominacao: (r.denominacao ?? '').toString().trim(),
          nif: (r.nif ?? '').toString().trim() || null,
          email: (r.email ?? '').toString().trim() || null,
          telefone: (r.telefone ?? '').toString().trim() || null,
          morada: (r.morada ?? '').toString().trim() || null,
          cidade: (r.cidade ?? '').toString().trim() || null,
          cod_postal: (r.cod_postal ?? '').toString().trim() || null,
          observacoes: (r.observacoes ?? '').toString().trim() || null,
        }));
        setRows(data.filter((d) => d.denominacao));
      },
      error: (e) => setErr(e.message),
    });
  }

  async function importar() {
    setMsg(null);
    setErr(null);
    if (rows.length === 0) {
      setErr('Selecione um CSV com cabeçalhos válidos.');
      return;
    }

    setBusy(true);
    try {
      // descobrir empresa_id (pegando do primeiro projeto cadastrado)
      const { data: prj, error: e0 } = await supa
        .from('projetos')
        .select('empresa_id')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (e0) throw e0;
      if (!prj?.empresa_id) throw new Error('empresa_id não encontrado (tabela projetos).');

      // upsert em lotes para evitar payloads grandes
      const BATCH = 200;
      for (let i = 0; i < rows.length; i += BATCH) {
        const slice = rows.slice(i, i + BATCH).map((r) => ({
          empresa_id: prj.empresa_id,
          denominacao: r.denominacao!,
          nif: r.nif,
          email: r.email,
          telefone: r.telefone,
          morada: r.morada,
          cidade: r.cidade,
          cod_postal: r.cod_postal,
          observacoes: r.observacoes,
        }));

        const { error } = await supa
          .from('fornecedores')
          .upsert(slice, { onConflict: 'empresa_id,denominacao', ignoreDuplicates: false });
        if (error) throw error;
      }

      setMsg(`Importação concluída: ${rows.length} registo(s).`);
      setRows([]);
    } catch (e: any) {
      setErr(e?.message ?? 'Falha na importação');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 24, fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Importar Fornecedores (CSV)</h1>
        <Link href="/adm/fornecedores">
          <button style={{ padding: '8px 12px', border: '1px solid #ddd', background: '#fff', borderRadius: 8 }}>
            Voltar
          </button>
        </Link>
      </div>

      <p style={{ marginTop: 8 }}>
        Formato esperado (cabeçalhos): <code>denominacao, nif, email, telefone, morada, cidade, cod_postal, observacoes</code>
      </p>

      <div style={{ marginTop: 12 }}>
        <input type="file" accept=".csv" onChange={onFile} />
      </div>

      {rows.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 14, color: '#444' }}>
          Pré-visualização: {rows.length} linha(s) pronta(s) para importar.
        </div>
      )}

      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <button
          onClick={importar}
          disabled={busy || rows.length === 0}
          style={{
            padding: '10px 14px',
            border: '1px solid #111',
            background: busy || rows.length === 0 ? '#999' : '#111',
            color: '#fff',
            borderRadius: 8,
            cursor: busy || rows.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          {busy ? 'A importar…' : 'Importar'}
        </button>
        <a href="/adm/fornecedores/modelo.csv" download>
          <button style={{ padding: '10px 14px', border: '1px solid #ddd', background: '#fff', borderRadius: 8 }}>
            Baixar modelo CSV
          </button>
        </a>
      </div>

      {msg && <p style={{ marginTop: 10, color: '#14532d' }}>{msg}</p>}
      {err && <p style={{ marginTop: 10, color: '#7f1d1d' }}>Erro: {err}</p>}
    </div>
  );
}
