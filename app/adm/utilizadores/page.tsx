// app/adm/utilizadores/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

type Papel = 'admin' | 'gestor' | 'externo';
type Row = {
  user_id: string;
  email: string | null;
  last_sign_in_at: string | null;
  papel: Papel;
  empresa_id: string | null;
  nome: string | null;
  nome_exibicao: string | null;
  created_at: string | null;
  updated_at: string | null;
  profile_id: string | null;
};

export default function UtilizadoresAdmPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [list, setList] = useState<Row[] | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [invite, setInvite] = useState<{ email: string; nome: string; papel: Papel }>({ email: '', nome: '', papel: 'externo' });
  const [inviting, setInviting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoadingList(true);
    setErr(null);
    try {
      const res = await fetch('/api/admin/users/list', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao listar');
      setList(data);
    } catch (e: any) {
      setErr(e?.message || 'Falha ao listar');
      setList([]);
    } finally {
      setLoadingList(false);
    }
  }

  async function doInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(invite),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao convidar');
      setMsg('Convite enviado. O utilizador receberá um email para confirmar o acesso.');
      setInvite({ email: '', nome: '', papel: 'externo' });
      await load();
    } catch (e: any) {
      setErr(e?.message || 'Falha ao convidar');
    } finally {
      setInviting(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <main style={{ padding: 18 }}>
      <h1 className="h1" style={{ marginBottom: 12 }}>Utilizadores</h1>

      {/* CONVITE */}
      <section className="card" style={{ marginBottom: 16 }}>
        <h2 className="h2">Convidar utilizador</h2>
        <form onSubmit={doInvite} style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr 160px auto' }}>
          <div>
            <label className="muted">Email</label>
            <input
              type="email" required value={invite.email}
              onChange={e => setInvite(i => ({ ...i, email: e.target.value }))}
              style={{ width: '100%', padding: 10, border: '1px solid var(--border)', borderRadius: '10px' }}
            />
          </div>
          <div>
            <label className="muted">Nome</label>
            <input
              type="text" value={invite.nome}
              onChange={e => setInvite(i => ({ ...i, nome: e.target.value }))}
              style={{ width: '100%', padding: 10, border: '1px solid var(--border)', borderRadius: '10px' }}
            />
          </div>
          <div>
            <label className="muted">Papel</label>
            <select
              value={invite.papel}
              onChange={e => setInvite(i => ({ ...i, papel: e.target.value as Papel }))}
              style={{ width: '100%', padding: 10, border: '1px solid var(--border)', borderRadius: '10px', background: '#fff' }}
            >
              <option value="externo">Externo</option>
              <option value="gestor">Gestor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div style={{ alignSelf: 'end' }}>
            <button className="btn btn-primary" disabled={inviting} type="submit">
              {inviting ? 'A convidar…' : 'Convidar'}
            </button>
          </div>
        </form>

        {err && <p style={{ color: 'crimson', marginTop: 8 }}>{err}</p>}
        {msg && <p style={{ color: 'green', marginTop: 8 }}>{msg}</p>}
      </section>

      {/* LISTA */}
      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h2 className="h2">Lista</h2>
          <button className="btn btn-ghost" onClick={load} disabled={loadingList}>
            {loadingList ? 'A carregar…' : 'Recarregar'}
          </button>
        </div>

        {!list?.length && !loadingList && <p className="muted">Sem registos.</p>}
        {!!list?.length && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '8px' }}>Nome</th>
                  <th style={{ padding: '8px' }}>Email</th>
                  <th style={{ padding: '8px' }}>Papel</th>
                  <th style={{ padding: '8px' }}>Último acesso</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.user_id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px' }}>{r.nome_exibicao || r.nome || '—'}</td>
                    <td style={{ padding: '8px' }}>{r.email || '—'}</td>
                    <td style={{ padding: '8px', textTransform: 'capitalize' }}>{r.papel}</td>
                    <td style={{ padding: '8px' }}>{r.last_sign_in_at ? new Date(r.last_sign_in_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
