'use client';

import { useEffect, useState } from 'react';

type Row = {
  id: string;
  codigo: string | null;
  denominacao: string | null;
  nif: string | null;
  email: string | null;
  telefone: string | null;
  ativo: boolean | null;
  updated_at: string | null;
};

export default function FornecedoresListPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/admin/fornecedores/list', { cache: 'no-store' });
      const j = await res.json();
      if (!res.ok || j?.error) throw new Error(j?.error || 'Falha ao listar');
      setRows(j.rows as Row[]);
    } catch (e: any) {
      setErr(e?.message ?? 'Falha ao listar');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function remover(id: string) {
    if (!confirm('Eliminar fornecedor?')) return;
    try {
      const res = await fetch('/api/admin/fornecedores/delete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const j = await res.json();
      if (!res.ok || j?.error) throw new Error(j?.error || 'Falha ao eliminar');
      await load();
    } catch (e: any) {
      alert(e?.message ?? 'Falha ao eliminar');
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <main style={{ padding: 18 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h1 className="h1">Fornecedores</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={load} disabled={loading}>
            {loading ? 'A carregar…' : 'Recarregar'}
          </button>
          {/* Quando houver criação, aponta para /adm/fornecedores/new */}
          {/* <a className="btn btn-primary" href="/adm/fornecedores/new">Novo</a> */}
        </div>
      </header>

      <section className="card">
        {err && <p style={{ color: 'crimson', marginBottom: 8 }}>{err}</p>}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                <th style={th}>Código</th>
                <th style={th}>Denominação</th>
                <th style={th}>NIF</th>
                <th style={th}>Telefone</th>
                <th style={th}>Email</th>
                <th style={th}>Ativo</th>
                <th style={{ ...th, textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={td}>{r.codigo ?? '—'}</td>
                  <td style={td}>{r.denominacao ?? '—'}</td>
                  <td style={td}>{r.nif ?? '—'}</td>
                  <td style={td}>{r.telefone ?? '—'}</td>
                  <td style={td}>{r.email ?? '—'}</td>
                  <td style={td}>{(r.ativo ?? true) ? 'Sim' : 'Não'}</td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <a className="btn btn-ghost" href={`/adm/fornecedores/${r.id}`} aria-label="Editar">Editar</a>
                    <button className="btn btn-ghost" style={{ marginLeft: 6 }} onClick={() => remover(r.id)} aria-label="Eliminar">Eliminar</button>
                  </td>
                </tr>
              ))}
              {!rows.length && !loading && (
                <tr><td colSpan={7} style={{ padding: 12 }} className="muted">Sem registos.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

const th: React.CSSProperties = { padding: '8px' };
const td: React.CSSProperties = { padding: '8px' };
