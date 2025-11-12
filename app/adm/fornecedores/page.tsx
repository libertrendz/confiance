// app/adm/fornecedores/page.tsx
'use client';

import { useEffect, useState } from 'react';

type Row = {
  id: string;
  codigo: string | null;
  denominacao: string | null;
  nif: string | null;
  telefone: string | null;
  email: string | null;
  ativo: boolean | null;
};

export default function FornecedoresAdmPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/admin/fornecedores/list', { cache: 'no-store' });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j?.error || 'Falha ao listar');
      setRows(j.rows as Row[]);
    } catch (e: any) {
      setErr(e?.message || 'Falha ao listar');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <main style={{ padding: 18 }}>
      <h1 className="h1" style={{ marginBottom: 12 }}>Fornecedores</h1>

      <section className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p className="muted" style={{ margin: 0 }}>Lista oficial por empresa.</p>
          <button className="btn btn-ghost" onClick={load} disabled={loading}>
            {loading ? 'A carregar…' : 'Recarregar'}
          </button>
        </div>
        {err && <p style={{ color: 'crimson', marginTop: 8 }}>{err}</p>}
      </section>

      <section className="card">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: 8 }}>Código</th>
                <th style={{ padding: 8 }}>Denominação</th>
                <th style={{ padding: 8 }}>NIF</th>
                <th style={{ padding: 8 }}>Telefone</th>
                <th style={{ padding: 8 }}>Email</th>
                <th style={{ padding: 8 }}>Ativo</th>
                <th style={{ padding: 8, textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: 8 }}>{r.codigo || '—'}</td>
                  <td style={{ padding: 8 }}>{r.denominacao || '—'}</td>
                  <td style={{ padding: 8 }}>{r.nif || '—'}</td>
                  <td style={{ padding: 8 }}>{r.telefone || '—'}</td>
                  <td style={{ padding: 8 }}>{r.email || '—'}</td>
                  <td style={{ padding: 8 }}>{r.ativo ? 'Sim' : 'Não'}</td>
                  <td style={{ padding: 8, textAlign: 'right' }}>
                    <a href={`/adm/fornecedores/${r.id}/edit`} className="btn btn-ghost">Editar</a>
                    {/* delete virá depois */}
                  </td>
                </tr>
              ))}
              {!rows.length && !loading && (
                <tr><td colSpan={7} style={{ padding: 12, color: '#666' }}>Sem registos.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
