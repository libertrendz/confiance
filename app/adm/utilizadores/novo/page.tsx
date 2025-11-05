// app/adm/utilizadores/novo/page.tsx
'use client';

import { useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

export const dynamic = 'force-dynamic';

export default function NovoUtilizadorPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [papel, setPapel] = useState<'colaborador'|'gestor'|'admin'>('colaborador');
  const [msg, setMsg] = useState<string|null>(null);
  const [err, setErr] = useState<string|null>(null);
  const [sending, setSending] = useState(false);

  async function criar(ev: React.FormEvent) {
    ev.preventDefault();
    setSending(true); setMsg(null); setErr(null);
    try {
      const { data: { session } } = await supa.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Sem sessão');

      const res = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ email, nome, papel }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.details || json?.error || 'Falha ao criar utilizador');

      setMsg('Convite enviado. O colaborador receberá um email para entrar.');
      setEmail(''); setNome(''); setPapel('colaborador');
    } catch (e:any) {
      setErr(e?.message || 'Erro inesperado');
    } finally {
      setSending(false);
    }
  }

  return (
    <main style={{ padding: 16, fontFamily: 'system-ui', maxWidth: 520, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Novo Utilizador</h1>
      <form onSubmit={criar}>
        <label>Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 8, margin: '6px 0 12px' }}
        />

        <label>Nome</label>
        <input
          type="text"
          value={nome}
          onChange={e => setNome(e.target.value)}
          placeholder="Opcional"
          style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 8, margin: '6px 0 12px' }}
        />

        <label>Papel</label>
        <select
          value={papel}
          onChange={e => setPapel(e.target.value as any)}
          style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 8, margin: '6px 0 16px' }}
        >
          <option value="colaborador">colaborador</option>
          <option value="gestor">gestor</option>
          <option value="admin">admin</option>
        </select>

        <button
          type="submit"
          disabled={sending || !email.trim()}
          style={{ padding: 12, width: '100%', borderRadius: 10, border: 'none', background: '#0A3D91', color: '#fff', cursor: 'pointer', opacity: sending ? 0.7 : 1 }}
        >
          {sending ? 'A criar…' : 'Criar utilizador'}
        </button>
      </form>

      {msg && <p style={{ color: 'green', marginTop: 12 }}>{msg}</p>}
      {err && <p style={{ color: 'crimson', marginTop: 12 }}>{err}</p>}
    </main>
  );
}
