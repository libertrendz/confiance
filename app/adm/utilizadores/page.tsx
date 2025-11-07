// app/adm/utilizadores/page.tsx
'use client';

import { useEffect, useState } from 'react';

type Row = {
  id: string;
  user_id: string | null;
  empresa_id: string | null;
  papel: 'admin' | 'gestor' | 'externo';
  nome: string | null;
  nome_exibicao: string | null;
  created_at: string;
  updated_at: string;
};

export default function UtilizadoresPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/users/list', { cache: 'no-store' });
        const json = await res.json();
        if (!alive) return;
        if (!json?.ok) throw new Error(json?.error || 'Falha ao listar');
        setRows(json.rows || []);
      } catch (e: any) {
        if (alive) setErr(e?.message || 'Erro');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <main style={{ display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: '100vh' }}>
      {/* Sidebar fixa (ADM) */}
      <aside style={{ borderRight: '1px solid #E9EEF7', padding: 16 }}>
        <h3 style={{ margin: 0, color: '#0e3258' }}>Admin</h3>
        <nav style={{ marginTop: 12, display: 'grid', gap: 8 }}>
          <a href="/adm/dashboard">Dashboard</a>
          <a href="/adm/utilizadores" style={{ fontWeight: 700, color: '#0e3258' }}>Utilizadores</a>
          <a href="/adm/ponto">Ponto</a>
          <a href="/adm/fornecedores">Fornecedores</a>
          <a href="/adm/clientes">Clientes</a>
          <a href="/adm/orcamentos">Orçamentos</a>
          <a href="/adm/contratos">Contratos</a>
          <a href="/adm/financeiro">Financeiro</a>
          <a href="/adm/config">Configurações</a>
        </nav>
      </aside>

      {/* Conteúdo */}
      <section style={{ padding: 18, fontFamily: 'system-ui', maxWidth: 1100 }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0e3258' }}>Utilizadores</h1>
          <a
            href="/adm/utilizadores/convite"
            style={{ textDecoration: 'none', padding: '8px 12px', borderRadius: 10, background: '#0e3258', color: '#fff' }}
          >
            Convidar novo
          </a>
        </header>

        {loading && <p style={{ color: '#666' }}>A carregar…</p>}
        {err && <p style={{ color: 'crimson' }}>{err}</p>}

        {!loading && !err && (
          <div style={{ overflowX: 'auto', border: '1px solid #E9EEF7', borderRadius: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#F7FAFF' }}>
                <tr>
                  <th style={th}>Nome</th>
                  <th style={th}>Papel</th>
                  <th style={th}>Email (user_id)</th>
                  <th style={th}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id}>
                    <td style={td}>{r.nome_exibicao || r.nome || '—'}</td>
                    <td style={td}><span style={pill}>{r.papel.toUpperCase()}</span></td>
                    <td style={td}><code style={{ fontSize: 12 }}>{r.user_id || '—'}</code></td>
                    <td style={td}>
                      <a href={`/adm/utilizadores/${r.id}/edit`} style={linkBtn}>Editar</a>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr><td style={td} colSpan={4}>Sem utilizadores.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

const th = { textAlign: 'left' as const, padding: '10px 12px', fontSize: 12, color: '#49546A', borderBottom: '1px solid #E9EEF7' };
const td = { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid #F1F4FB' };
const pill = { background: '#EEF3FF', color: '#0e3258', padding: '4px 8px', borderRadius: 999, border: '1px solid #D7E3FF', fontSize: 12 };
const linkBtn = { textDecoration: 'none', padding: '6px 10px', borderRadius: 8, border: '1px solid #D7E3FF', color: '#0e3258', fontSize: 13 };
