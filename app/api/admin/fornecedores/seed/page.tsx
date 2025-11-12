'use client';

import { useState } from 'react';

export default function SeedFornecedoresPage() {
  const [out, setOut] = useState<string>('');
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    setOut('');
    try {
      const res = await fetch('/api/admin/fornecedores/seed', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      setOut(JSON.stringify(data, null, 2));
    } catch (e: any) {
      setOut(`{ "ok": false, "error": "${e?.message || 'falhou'}" }`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 18, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: '#0e3258' }}>
        Seed de Fornecedores
      </h1>
      <p style={{ color: '#555' }}>
        Lê o CSV do repositório e faz upsert na tabela <code>fornecedores</code>.
      </p>

      <button
        onClick={run}
        disabled={loading}
        className="btn btn-primary"
        style={{ padding: '10px 14px', borderRadius: 10 }}
      >
        {loading ? 'A executar…' : 'Executar seed'}
      </button>

      {!!out && (
        <pre
          style={{
            marginTop: 16,
            padding: 12,
            background: '#0b1220',
            color: '#e3e8ef',
            borderRadius: 10,
            overflow: 'auto',
            maxHeight: 420,
          }}
        >
{out}
        </pre>
      )}
    </main>
  );
}
