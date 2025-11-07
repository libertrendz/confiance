'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

type UserRow = {
  user_id: string;
  email: string | null;
  nome: string | null;
  papel: 'admin' | 'gestor' | 'externo';
  empresa_id: string;
  created_at: string | null;
  last_sign_in_at: string | null;
};

export default function UtilizadoresPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // estado de edição por linha
  const [rowState, setRowState] = useState<Record<string, { nome: string; papel: UserRow['papel'] }>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch('/api/admin/users/list', { cache: 'no-store' });
        const js = await res.json();
        if (!res.ok) throw new Error(js?.error || 'Falha ao listar');
        const data: UserRow[] = js.users || [];
        setRows(data);
        // inicializa estado por id
        const init: Record<string, { nome: string; papel: UserRow['papel'] }> = {};
        for (const r of data) {
          init[r.user_id] = { nome: r.nome || '', papel: r.papel };
        }
        setRowState(init);
      } catch (e: any) {
        setErr(e.message || 'Erro ao carregar');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function guardar(user_id: string) {
    const state = rowState[user_id];
    if (!state) return;
    const payload = {
      user_id,
      nome: state.nome || null,
      nome_exibicao: state.nome || null,
      papel: state.papel,
    };
    const res = await fetch('/api/admin/users/update', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const js = await res.json().catch(() => ({}));
      alert(`Falha ao salvar: ${js?.error || res.statusText}`);
      return;
    }
    // refresh leve
    setRows(prev => prev.map(r => r.user_id === user_id ? { ...r, nome: state.nome, papel: state.papel } : r));
  }

  async function convidar(form: FormData) {
    const email = String(form.get('email') || '').trim();
    const nome = String(form.get('nome') || '').trim();
    const papel = String(form.get('papel') || 'externo') as UserRow['papel'];
    if (!email) { alert('Informe email'); return; }

    const res = await fetch('/api/admin/users/invite', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, nome, papel }),
    });
    const js = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(`Falha ao convidar: ${js?.error || res.statusText}`);
      return;
    }
    alert('Convite enviado. O utilizador deve confirmar por email.');
  }

  if (loading) {
    return <main style={{ padding: 18, fontFamily: 'system-ui' }}>A carregar…</main>;
  }
  if (err) {
    return <main style={{ padding: 18, fontFamily: 'system-ui', color: 'crimson' }}>{err}</main>;
  }

  return (
    <main style={{ padding: 18, fontFamily: 'system-ui', maxWidth: 1100 }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12, color: '#0e3258' }}>Utilizadores</h1>

      {/* Tabela */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F4F7FB' }}>
              <Th>Email</Th>
              <Th>Nome</Th>
              <Th>Papel</Th>
              <Th>Último acesso</Th>
              <Th>Ações</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const st = rowState[r.user_id] || { nome: r.nome || '', papel: r.papel };
              return (
                <tr key={r.user_id} style={{ borderBottom: '1px solid #EEF2F7' }}>
                  <Td>{r.email || '—'}</Td>
                  <Td>
                    <input
                      value={st.nome}
                      onChange={e => setRowState(prev => ({ ...prev, [r.user_id]: { ...st, nome: e.target.value } }))}
                      style={{ width: '100%', padding: 6, border: '1px solid #ddd', borderRadius: 8 }}
                      placeholder="Nome para exibição"
                    />
                  </Td>
                  <Td>
                    <select
                      value={st.papel}
                      onChange={e => setRowState(prev => ({ ...prev, [r.user_id]: { ...st, papel: e.target.value as UserRow['papel'] } }))}
                      style={{ padding: 6, border: '1px solid #ddd', borderRadius: 8 }}
                    >
                      <option value="externo">Externo</option>
                      <option value="gestor">Gestor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </Td>
                  <Td>{r.last_sign_in_at ? new Date(r.last_sign_in_at).toLocaleString() : '—'}</Td>
                  <Td>
                    <button
                      onClick={() => guardar(r.user_id)}
                      style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #0e3258', color: '#0e3258', background: '#fff' }}
                    >
                      Guardar
                    </button>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Convite */}
      <section style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0e3258' }}>Convidar novo utilizador</h2>
        <form
          onSubmit={e => { e.preventDefault(); convidar(new FormData(e.currentTarget)); }}
          style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr auto', gap: 8, alignItems: 'center', marginTop: 8 }}
        >
          <input name="email" type="email" placeholder="email@dominio" required style={inp} />
          <input name="nome" type="text" placeholder="Nome (opcional)" style={inp} />
          <select name="papel" defaultValue="externo" style={inp}>
            <option value="externo">Externo</option>
            <option value="gestor">Gestor</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" style={{ padding: '10px 14px', borderRadius: 10, border: 'none', background: '#0e3258', color: '#fff' }}>
            Convidar
          </button>
        </form>
      </section>
    </main>
  );
}

const inp: React.CSSProperties = { padding: 8, border: '1px solid #ddd', borderRadius: 8 };

function Th({ children }: { children: any }) {
  return <th style={{ textAlign: 'left', padding: 10, fontSize: 12, color: '#445', fontWeight: 700 }}>{children}</th>;
}
function Td({ children }: { children: any }) {
  return <td style={{ padding: 10, fontSize: 13, color: '#223' }}>{children}</td>;
}
