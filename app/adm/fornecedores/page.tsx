'use client';

import { useEffect, useMemo, useState } from 'react';

type Row = {
  id: string;
  codigo: string | null;
  denominacao: string | null;
  nif: string | null;
  telefone: string | null;
  email: string | null;
  ativo: boolean | null;
};

type NewForm = {
  denominacao: string;
  nif: string;
  email: string;
  telefone: string;
};

export default function FornecedoresPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [newForm, setNewForm] = useState<NewForm>({
    denominacao: '',
    nif: '',
    email: '',
    telefone: '',
  });

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const url = q.trim()
        ? `/api/admin/fornecedores/list?q=${encodeURIComponent(q.trim())}`
        : `/api/admin/fornecedores/list`;
      const res = await fetch(url, { cache: 'no-store' });
      const j = await res.json();
      if (!res.ok || !j?.ok) throw new Error(j?.error || 'Falha ao listar');
      setRows(j.rows || []);
    } catch (e: any) {
      setErr(e?.message || 'Falha ao listar');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function createQuick(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setErr(null);
    try {
      const res = await fetch('/api/admin/fornecedores/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(newForm),
      });
      const j = await res.json();
      if (!res.ok || !j?.ok) throw new Error(j?.error || 'Falha ao criar');
      setNewForm({ denominacao: '', nif: '', email: '', telefone: '' });
      await load();
      alert('Fornecedor criado.');
    } catch (e: any) {
      setErr(e?.message || 'Falha ao criar');
    } finally {
      setCreating(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Eliminar este fornecedor?')) return;
    try {
      const res = await fetch('/api/admin/fornecedores/delete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const j = await res.json();
      if (!res.ok || !j?.ok) throw new Error(j?.error || 'Falha ao eliminar');
      await load();
    } catch (e: any) {
      alert(e?.message || 'Falha ao eliminar');
    }
  }

  useEffect(() => { load(); }, []); // primeira carga

  return (
    <main style={{ padding: 18 }}>
      <h1 className="h1" style={{ marginBottom: 12 }}>Fornecedores</h1>
      <p className="muted" style={{ marginTop: 0, marginBottom: 16 }}>Lista oficial por empresa.</p>

      {/* Pesquisa + Recarregar */}
      <div className="card" style={{ marginBottom: 12, display: 'grid', gap: 10, gridTemplateColumns: '1fr auto auto' }}>
        <input
          placeholder="Pesquisar por denominação, NIF, telefone, email…"
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') load(); }}
          style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 10 }}
        />
        <button className="btn btn-ghost" onClick={load} disabled={loading}>
          {loading ? 'A carregar…' : 'Recarregar'}
        </button>
        <a className="btn btn-primary" href="/adm/fornecedores/new">Adicionar</a>
      </div>

      {/* Criação rápida inline */}
      <section className="card" style={{ marginBottom: 16 }}>
        <h2 className="h2">Criar rápido</h2>
        <form onSubmit={createQuick} style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 160px 160px 160px auto' }}>
          <input
            placeholder="Denominação"
            required
            value={newForm.denominacao}
            onChange={e => setNewForm(f => ({ ...f, denominacao: e.target.value }))}
            style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 10 }}
          />
          <input
            placeholder="NIF"
            value={newForm.nif}
            onChange={e => setNewForm(f => ({ ...f, nif: e.target.value }))}
            style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 10 }}
          />
          <input
            placeholder="Email"
            type="email"
            value={newForm.email}
            onChange={e => setNewForm(f => ({ ...f, email: e.target.value }))}
            style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 10 }}
          />
          <input
            placeholder="Telefone"
            value={newForm.telefone}
            onChange={e => setNewForm(f => ({ ...f, telefone: e.target.value }))}
            style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 10 }}
          />
          <button className="btn btn-primary" disabled={creating} type="submit">
            {creating ? 'A criar…' : 'Criar'}
          </button>
        </form>
        {err && <p style={{ color: 'crimson', marginTop: 8 }}>{err}</p>}
      </section>

      {/* Tabela */}
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
                    <a className="btn btn-ghost" href={`/adm/fornecedores/${r.id}/edit`}>Editar</a>
                    <button className="btn btn-ghost" style={{ marginLeft: 6 }} onClick={() => remove(r.id)}>
                      Eliminar
                    </button>
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
