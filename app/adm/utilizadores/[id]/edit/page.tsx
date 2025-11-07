// app/adm/utilizadores/[id]/edit/page.tsx
'use client';

import { useEffect, useState } from 'react';

type Papel = 'admin' | 'gestor' | 'externo';

export default function EditUtilizadorPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const [nome, setNome] = useState('');
  const [nomeExib, setNomeExib] = useState('');
  const [papel, setPapel] = useState<Papel>('externo');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/users/list', { cache: 'no-store' });
        const json = await res.json();
        if (!alive) return;
        if (!json?.ok) throw new Error(json?.error || 'Falha ao carregar');
        const row = (json.rows || []).find((r: any) => r.id === id);
        if (!row) throw new Error('Utilizador não encontrado');
        setNome(row.nome || '');
        setNomeExib(row.nome_exibicao || '');
        setPapel(row.papel || 'externo');
      } catch (e: any) {
        if (alive) setErr(e?.message || 'Erro');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch('/api/admin/users/update', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id,
          nome,
          nome_exibicao: nomeExib,
          papel,
        }),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || 'Falha ao guardar');
      setMsg('Guardado com sucesso.');
    } catch (e: any) {
      setErr(e?.message || 'Erro');
    }
  }

  return (
    <main style={{ display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: '100vh' }}>
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

      <section style={{ padding: 18, fontFamily: 'system-ui', maxWidth: 900 }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0e3258' }}>Editar utilizador</h1>
          <a href="/adm/utilizadores" style={{ textDecoration: 'none', fontSize: 13 }}>Voltar</a>
        </header>

        {loading && <p style={{ color: '#666' }}>A carregar…</p>}
        {err && <p style={{ color: 'crimson' }}>{err}</p>}

        {!loading && !err && (
          <form onSubmit={guardar} style={{ display: 'grid', gap: 12, maxWidth: 520 }}>
            <div>
              <label>Nome</label>
              <input value={nome} onChange={(e) => setNome(e.target.value)}
                     style={inp} placeholder="Nome completo" />
            </div>
            <div>
              <label>Nome de exibição</label>
              <input value={nomeExib} onChange={(e) => setNomeExib(e.target.value)}
                     style={inp} placeholder="Como aparece no cabeçalho" />
            </div>
            <div>
              <label>Papel</label>
              <select value={papel} onChange={(e) => setPapel(e.target.value as any)} style={inp}>
                <option value="admin">admin</option>
                <option value="gestor">gestor</option>
                <option value="externo">externo</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" style={btnPrimary}>Guardar</button>
              <a href="/adm/utilizadores" style={btnGhost}>Cancelar</a>
            </div>

            {msg && <p style={{ color: 'green' }}>{msg}</p>}
          </form>
        )}
      </section>
    </main>
  );
}

const inp = { width: '100%', padding: 10, border: '1px solid #D7E3FF', borderRadius: 10 } as const;
const btnPrimary = { textDecoration: 'none', padding: '10px 14px', borderRadius: 10, background: '#0e3258', color: '#fff', border: 'none' } as const;
const btnGhost = { textDecoration: 'none', padding: '10px 14px', borderRadius: 10, border: '1px solid #D7E3FF', color: '#0e3258' } as const;
