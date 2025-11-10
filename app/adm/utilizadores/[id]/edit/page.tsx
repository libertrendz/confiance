// app/adm/utilizadores/[id]/edit/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

type Papel = 'admin' | 'gestor' | 'externo';
type Row = {
  user_id: string;
  email: string | null;
  nome: string | null;
  nome_exibicao: string | null;
  papel: Papel | null;
  last_sign_in_at: string | null;
};

export default function EditUtilizadorPage({ searchParams }: { searchParams: { id?: string } }) {
  const id = searchParams?.id || '';
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [row, setRow] = useState<Row | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setErr(null);
    try {
      const res = await fetch(`/api/admin/users/get?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao carregar');
      setRow(data);
    } catch (e: any) {
      setErr(e?.message || 'Falha ao carregar');
    }
  }

  async function save() {
    if (!row) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch('/api/admin/users/update', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          user_id: row.user_id,
          nome: row.nome_exibicao || row.nome || null,
          papel: row.papel || 'externo',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao guardar');
      window.location.href = '/adm/utilizadores';
    } catch (e: any) {
      setErr(e?.message || 'Falha ao guardar');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => { if (id) load(); }, [id]);

  if (!id) return <main style={{ padding: 18 }}><p style={{ color: 'crimson' }}>ID em falta.</p></main>;
  if (!row) return <main style={{ padding: 18 }}><p className="muted">{err || 'A carregar…'}</p></main>;

  return (
    <main style={{ padding: 18, display: 'grid', gap: 12, maxWidth: 640 }}>
      <h1 className="h1">Editar utilizador</h1>
      {err && <p style={{ color: 'crimson' }}>{err}</p>}

      <label className="muted">Email</label>
      <input value={row.email || ''} disabled style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 10, background: '#f7f9fc' }} />

      <label className="muted">Nome</label>
      <input
        value={row.nome_exibicao || row.nome || ''}
        onChange={e => setRow(r => r ? { ...r, nome_exibicao: e.target.value } : r)}
        style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 10 }}
      />

      <label className="muted">Papel</label>
      <select
        value={row.papel || 'externo'}
        onChange={e => setRow(r => r ? { ...r, papel: e.target.value as Papel } : r)}
        style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 10, background: '#fff' }}
      >
        <option value="externo">Externo</option>
        <option value="gestor">Gestor</option>
        <option value="admin">Admin</option>
      </select>

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={save} className="btn btn-primary" disabled={saving}>{saving ? 'A guardar…' : 'Guardar'}</button>
        <a href="/adm/utilizadores" className="btn btn-ghost">Cancelar</a>
      </div>
    </main>
  );
}
