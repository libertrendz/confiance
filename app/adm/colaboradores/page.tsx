// app/adm/colaboradores/page.tsx
'use client';

import { useEffect, useState } from 'react';

type Row = {
  id: string;
  nome: string | null;
  nif: string | null;
  email: string | null;
  telefone: string | null;
  tipo: string | null;
  custo_hora: number | null;
  data_admissao: string | null;
  ativo: boolean | null;
};

export default function ColaboradoresListPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/admin/colaboradores/list', { cache: 'no-store' });
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        throw new Error(`Resposta inválida do servidor (${res.status})`);
      }
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'Falha ao listar colaboradores');
      setRows(j.rows || []);
    } catch (e: any) {
      setErr(e?.message || 'Falha ao listar colaboradores');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Eliminar colaborador?')) return;
    try {
      const res = await fetch('/api/admin/colaboradores/delete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        throw new Error(`Resposta inválida do servidor (${res.status})`);
      }
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'Falha ao eliminar colaborador');
      await load();
    } catch (e: any) {
      alert(e?.message || 'Falha ao eliminar colaborador');
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main style={{ padding: 18 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <h1 className="h1">Colaboradores</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={load} disabled={loading}>
            {loading ? 'A carregar…' : 'Recarregar'}
          </button>
          <a href="/adm/colaboradores/new" className="btn btn-primary">
            Novo colaborador
          </a>
        </div>
      </div>

      <section className="card">
        {err && <p style={{ color: 'crimson', marginBottom: 8 }}>{err}</p>}

        {!rows.length && !loading && <p className="muted">Sem registos.</p>}

        {!!rows.length && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: 8 }}>Nome</th>
                  <th style={{ padding: 8 }}>NIF</th>
                  <th style={{ padding: 8 }}>Tipo</th>
                  <th style={{ padding: 8 }}>Email</th>
                  <th style={{ padding: 8 }}>Telefone</th>
                  <th style={{ padding: 8 }}>Ativo</th>
                  <th style={{ padding: 8, textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: 8 }}>{r.nome || '—'}</td>
                    <td style={{ padding: 8 }}>{r.nif || '—'}</td>
                    <td style={{ padding: 8, textTransform: 'capitalize' }}>{r.tipo || '—'}</td>
                    <td style={{ padding: 8 }}>{r.email || '—'}</td>
                    <td style={{ padding: 8 }}>{r.telefone || '—'}</td>
                    <td style={{ padding: 8 }}>{r.ativo ? 'Sim' : 'Não'}</td>
                    <td style={{ padding: 8, textAlign: 'right' }}>
                      <a
                        href={`/adm/colaboradores/${r.id}/edit`}
                        className="btn btn-ghost"
                        style={{ marginRight: 6 }}
                      >
                        Editar
                      </a>
                      <button
                        onClick={() => remove(r.id)}
                        className="btn btn-ghost"
                        style={{ borderColor: '#fee2e2', color: '#b91c1c' }}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {loading && <p className="muted" style={{ marginTop: 8 }}>A carregar…</p>}
      </section>
    </main>
  );
}
