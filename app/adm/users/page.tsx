'use client';

import { useEffect, useState } from 'react';

type Row = {
  id: string;
  email: string | null;
  nome: string | null;
  papel: 'admin' | 'gestor' | 'externo' | null;
  created_at?: string | null;
  last_sign_in_at?: string | null;
};

const AZUL = '#0e3258';

export default function UsersAdminPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteNome, setInviteNome] = useState('');
  const [invitePapel, setInvitePapel] = useState<'admin'|'gestor'|'externo'>('externo');

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/admin/users/list', { cache: 'no-store' });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'Falha ao listar');
      setRows(j.rows);
    } catch (e: any) {
      setErr(e?.message ?? 'Falha ao listar');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function invite() {
    try {
      setErr(null);
      const res = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), nome: inviteNome.trim(), papel: invitePapel }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error);
      setInviteEmail(''); setInviteNome(''); setInvitePapel('externo');
      await load();
      alert('Convite enviado!');
    } catch (e: any) {
      setErr(e?.message ?? 'Falha ao convidar');
    }
  }

  async function save(row: Row) {
    try {
      const res = await fetch('/api/admin/users/update', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: row.id, nome: row.nome, papel: row.papel }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error);
      alert('Guardado.');
    } catch (e: any) {
      alert(e?.message ?? 'Falha ao guardar');
    }
  }

  async function remove(id: string) {
    if (!confirm('Remover utilizador?')) return;
    try {
      const res = await fetch('/api/admin/users/delete', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error);
      await load();
      alert('Removido.');
    } catch (e: any) {
      alert(e?.message ?? 'Falha ao remover');
    }
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #E9EEF7', borderRadius: 16, padding: 16 }}>
      <h1 style={{ marginTop: 0, fontSize: 18, fontWeight: 800, color: AZUL }}>Utilizadores</h1>

      {/* Convite */}
      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr 160px 120px', alignItems: 'end', marginBottom: 16 }}>
        <div>
          <label>Email</label>
          <input value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} style={input} placeholder="email@dominio.com" />
        </div>
        <div>
          <label>Nome</label>
          <input value={inviteNome} onChange={e=>setInviteNome(e.target.value)} style={input} placeholder="Nome do utilizador" />
        </div>
        <div>
          <label>Papel</label>
          <select value={invitePapel} onChange={e=>setInvitePapel(e.target.value as any)} style={input}>
            <option value="externo">Externo</option>
            <option value="gestor">Gestor</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button onClick={invite} style={btnPrimary}>Convidar</button>
      </div>

      {loading && <p style={{ color: '#666' }}>A carregar…</p>}
      {err && <p style={{ color: 'crimson' }}>{err}</p>}

      {/* Tabela */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', background: '#f6f8fb' }}>
              <th style={th}>Nome</th>
              <th style={th}>Email</th>
              <th style={th}>Papel</th>
              <th style={th}>Último login</th>
              <th style={th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td style={td}>
                  <input value={r.nome ?? ''} onChange={e=>{
                    const v = e.target.value;
                    setRows(rs => rs.map(x => x.id===r.id?{...x, nome:v}:x));
                  }} style={input} />
                </td>
                <td style={td}>{r.email}</td>
                <td style={td}>
                  <select value={r.papel ?? 'externo'} onChange={e=>{
                    const v = e.target.value as any;
                    setRows(rs => rs.map(x => x.id===r.id?{...x, papel:v}:x));
                  }} style={input}>
                    <option value="externo">Externo</option>
                    <option value="gestor">Gestor</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td style={td}>{r.last_sign_in_at ? new Date(r.last_sign_in_at).toLocaleString() : '—'}</td>
                <td style={td}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={()=>save(r)} style={btnGhost}>Guardar</button>
                    <button onClick={()=>remove(r.id)} style={btnDanger}>Remover</button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr><td colSpan={5} style={{ padding: 12, color: '#666' }}>Sem registos.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12 }}>
        <a href="/menu" style={link}>Voltar ao Menu</a>
      </div>
    </div>
  );
}

const input: React.CSSProperties = {
  width: '100%', padding: 10, border: '1px solid #D7E3FF', borderRadius: 10
};
const btnPrimary: React.CSSProperties = {
  padding: '10px 12px', borderRadius: 10, border: 'none', background: AZUL, color: '#fff', cursor: 'pointer'
};
const btnGhost: React.CSSProperties = {
  padding: '8px 10px', borderRadius: 10, border: '1px solid #D7E3FF', background: '#fff', color: AZUL, cursor: 'pointer'
};
const btnDanger: React.CSSProperties = {
  padding: '8px 10px', borderRadius: 10, border: '1px solid #ffd7d7', background: '#fff5f5', color: '#b00020', cursor: 'pointer'
};
const th: React.CSSProperties = { padding: 10, borderBottom: '1px solid #e9eef7' };
const td: React.CSSProperties = { padding: 8, borderBottom: '1px solid #f1f3f7' };
const link: React.CSSProperties = {
  textDecoration: 'none', fontSize: 13, padding: '8px 12px', borderRadius: 10, border: '1px solid #D7E3FF', background: '#fff', color: AZUL
};
