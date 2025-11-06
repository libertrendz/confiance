// app/adm/utilizadores/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

type Row = { id: string; email: string | null; nome: string | null; papel: 'admin'|'gestor'|'externo' };

export default function UtilizadoresPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Form de convite
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [papel, setPapel] = useState<'externo'|'gestor'|'admin'>('externo');
  const [sendingInvite, setSendingInvite] = useState(false);

  // Form de edição
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editPapel, setEditPapel] = useState<'externo'|'gestor'|'admin'>('externo');
  const [savingEdit, setSavingEdit] = useState(false);

  async function authFetch(input: RequestInfo, init?: RequestInit) {
    const { data } = await supa.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('missing_session');
    return fetch(input, {
      ...(init || {}),
      headers: {
        ...(init?.headers || {}),
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await authFetch('/api/admin/users/list');
      if (!r.ok) throw new Error(`${r.status}`);
      const j = await r.json();
      setRows(j.rows || []);
    } catch (e: any) {
      setErr(`Falha ao carregar: ${e?.message || 'erro'}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []); // eslint-disable-line

  async function convidar(e: React.FormEvent) {
    e.preventDefault();
    setSendingInvite(true);
    setErr(null);
    try {
      if (!email.trim()) throw new Error('email_vazio');
      const r = await authFetch('/api/admin/users/create', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), nome: nome.trim() || 'Utilizador', papel }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.details || j?.error || `HTTP ${r.status}`);
      setEmail('');
      setNome('');
      setPapel('externo');
      await load();
      alert('Convite enviado!');
    } catch (e: any) {
      setErr(`Falha ao convidar: ${e?.message || 'erro'}`);
    } finally {
      setSendingInvite(false);
    }
  }

  function abrirEdicao(u: Row) {
    setEditId(u.id);
    setEditNome(u.nome || '');
    setEditPapel(u.papel);
  }

  async function salvarEdicao(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setSavingEdit(true);
    setErr(null);
    try {
      const r = await authFetch('/api/admin/users/update', {
        method: 'POST',
        body: JSON.stringify({ user_id: editId, nome: editNome, papel: editPapel }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.details || j?.error || `HTTP ${r.status}`);
      setEditId(null);
      await load();
    } catch (e: any) {
      setErr(`Falha ao salvar: ${e?.message || 'erro'}`);
    } finally {
      setSavingEdit(false);
    }
  }

  async function apagar(user_id: string) {
    if (!confirm('Apagar utilizador? Esta ação é irreversível.')) return;
    try {
      const r = await authFetch('/api/admin/users/delete', {
        method: 'POST',
        body: JSON.stringify({ user_id }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.details || j?.error || `HTTP ${r.status}`);
      await load();
    } catch (e: any) {
      alert(`Falha ao apagar: ${e?.message || 'erro'}`);
    }
  }

  function voltarMenu() {
    window.location.href = '/menu';
  }

  return (
    <main style={{ padding: 16, fontFamily: 'system-ui', maxWidth: 1100, margin: '0 auto' }}>
      {/* TOPBAR com “Voltar ao Menu” */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h1 style={{ margin: 0, fontSize: 18, color: '#0A3D91' }}>Utilizadores</h1>
        <button onClick={voltarMenu} style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>
          Voltar ao Menu
        </button>
      </header>

      {/* Convite */}
      <section style={{ border: '1px solid #E9EEF7', borderRadius: 16, padding: 16, background: '#fff', marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, color: '#0A3D91' }}>Convidar novo utilizador</h3>
        <form onSubmit={convidar} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 180px 120px', gap: 8 }}>
          <input
            type="email" required placeholder="email@exemplo.com"
            value={email} onChange={(e) => setEmail(e.target.value)}
            style={{ padding: 10, border: '1px solid #D7E3FF', borderRadius: 10 }}
          />
          <input
            type="text" placeholder="Nome (opcional)"
            value={nome} onChange={(e) => setNome(e.target.value)}
            style={{ padding: 10, border: '1px solid #D7E3FF', borderRadius: 10 }}
          />
          <select
            value={papel} onChange={(e) => setPapel(e.target.value as any)}
            style={{ padding: 10, border: '1px solid #D7E3FF', borderRadius: 10 }}
          >
            <option value="externo">externo</option>
            <option value="gestor">gestor</option>
            <option value="admin">admin</option>
          </select>
          <button
            type="submit" disabled={sendingInvite || !email.trim()}
            style={{ border: 'none', borderRadius: 10, background: '#0A3D91', color: '#fff', cursor: 'pointer' }}
          >
            {sendingInvite ? 'A enviar…' : 'Enviar convite'}
          </button>
        </form>
      </section>

      {/* Lista */}
      <section style={{ border: '1px solid #E9EEF7', borderRadius: 16, padding: 16, background: '#fff' }}>
        <h3 style={{ marginTop: 0, color: '#0A3D91' }}>Lista</h3>
        {loading ? (
          <p style={{ color: '#666' }}>A carregar…</p>
        ) : err ? (
          <p style={{ color: 'crimson' }}>{err}</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left' }}>
                <th style={{ padding: 8, borderBottom: '1px solid #eee' }}>Nome</th>
                <th style={{ padding: 8, borderBottom: '1px solid #eee' }}>Email</th>
                <th style={{ padding: 8, borderBottom: '1px solid #eee' }}>Papel</th>
                <th style={{ padding: 8, borderBottom: '1px solid #eee' }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f5f9' }}>{u.nome || '—'}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f5f9' }}>{u.email || '—'}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f5f9' }}>{u.papel}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f5f9', textAlign: 'right' }}>
                    <button onClick={() => abrirEdicao(u)} style={{ marginRight: 8, padding: '6px 10px', borderRadius: 8, border: '1px solid #D7E3FF', background: '#fff', cursor: 'pointer' }}>
                      Editar
                    </button>
                    <button onClick={() => apagar(u.id)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #F5C6CB', background: '#fff5f5', color: '#B71C1C', cursor: 'pointer' }}>
                      Apagar
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan={4} style={{ padding: 12, color: '#666' }}>Sem utilizadores.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </section>

      {/* Modal simples de edição */}
      {editId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
          display: 'grid', placeItems: 'center', padding: 16
        }}>
          <form onSubmit={salvarEdicao}
            style={{ background: '#fff', borderRadius: 16, padding: 16, width: 'min(520px, 96vw)', display: 'grid', gap: 8 }}>
            <h3 style={{ margin: 0, color: '#0A3D91' }}>Editar utilizador</h3>
            <input
              type="text" placeholder="Nome"
              value={editNome} onChange={(e) => setEditNome(e.target.value)}
              style={{ padding: 10, border: '1px solid #D7E3FF', borderRadius: 10 }}
            />
            <select
              value={editPapel} onChange={(e) => setEditPapel(e.target.value as any)}
              style={{ padding: 10, border: '1px solid #D7E3FF', borderRadius: 10 }}
            >
              <option value="externo">externo</option>
              <option value="gestor">gestor</option>
              <option value="admin">admin</option>
            </select>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button type="button" onClick={() => setEditId(null)} style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #ddd', background: '#fff' }}>
                Cancelar
              </button>
              <button type="submit" disabled={savingEdit} style={{ padding: '8px 12px', borderRadius: 10, border: 'none', background: '#0A3D91', color: '#fff' }}>
                {savingEdit ? 'A guardar…' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
