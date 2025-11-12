// app/adm/fornecedores/seed/page.tsx
'use client';

import { useState } from 'react';

export default function SeedFornecedoresPage() {
  const [status, setStatus] = useState<'idle' | 'running' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState<string | null>(null);

  async function runSeed() {
    setStatus('running');
    setMsg(null);
    try {
      const res = await fetch('/api/admin/fornecedores/seed', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Falha ao executar seed');
      }
      setStatus('ok');
      const info =
        `Seed concluído. Inseridos: ${data.inserted ?? 0}, ` +
        `Atualizados: ${data.updated ?? 0}, Ignorados: ${data.skipped ?? 0}.`;
      setMsg(info);
    } catch (e: any) {
      setStatus('err');
      setMsg(e?.message || 'Erro ao executar seed');
    }
  }

  return (
    <main style={{ padding: 18, maxWidth: 900 }}>
      <h1 className="h1" style={{ marginBottom: 12 }}>Seed de Fornecedores</h1>

      <section className="card" style={{ marginBottom: 16 }}>
        <p className="muted" style={{ marginTop: 0 }}>
          Esta ação lê <code>app/api/admin/fornecedores/seed/fornecedores.csv</code> no servidor
          e faz upsert na tabela <strong>public.fornecedores</strong> com <em>empresa_id</em> fixo (ENV <code>CONF_EMPRESA_ID</code>).
        </p>

        <button
          className="btn btn-primary"
          onClick={runSeed}
          disabled={status === 'running'}
        >
          {status === 'running' ? 'A executar…' : 'Executar seed'}
        </button>

        {msg && (
          <p style={{ marginTop: 12, color: status === 'err' ? 'crimson' : 'green' }}>
            {msg}
          </p>
        )}
      </section>

      <a className="btn btn-ghost" href="/adm/fornecedores">Voltar</a>
    </main>
  );
}
