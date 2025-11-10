// app/adm/utilizadores/[id]/edit/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useParams } from 'next/navigation';

type Papel = 'admin' | 'gestor' | 'externo';

type Row = {
  user_id: string;
  email: string | null;
  papel: Papel | null;
  nome: string | null;
  nome_exibicao: string | null;
};

export default function UtilizadorEditPage() {
  const params = useParams();
  const search = useSearchParams();
  const id = (params?.id as string) || search.get('id') || '';

  const [row, setRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/users/get?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Falha ao carregar');
      setRow(j);
    } catch (e: any) {
      setErr(e?.message || 'Falha ao carregar');
    } finally {
      setLoading(false);
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
          id: row.user_id,
          nome: row.nome,
          nome_exibicao: row.nome_exibicao,
          papel: row.papel || 'externo',
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Falha ao guardar');
      history.back();
    } catch (e: any) {
      setErr(e?.message || 'Falha ao guardar');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => { if (id) load(); }, [id]);

  return (
    <main style={{ padding: 18 }}>
      <h1 className="h1" style={{ marginBottom: 12 }}>Editar utilizador</h1>

      {loading && <p className="muted">A carregar…</p>}
      {err && <p style={{ color: 'crimson' }}>{err}</p>}

      {row && (
        <section className="card" style={{ display: 'grid', gap: 12, maxWidth: 640 }}>
          <div>
            <label className="muted">Email</label>
            <input value={row.email || ''} readOnly style={{ width: '100%', padding: 10, border: '1px solid var(--border)', borderRadius: 10, background: '#f6f8fb' }} />
          </div>
          <div>
            <label className="muted">Nome</label>
            <input
              value={row.nome || ''}
              onChange={e => setRow(r => r ? { ...r, nome: e.target.value } : r)}
              style={{ width: '100%', padding: 10, border: '1px solid var(--border)', borderRadius: 10 }}
            />
          </div>
          <div>
            <label className="muted">Nome de exibição</label>
            <input
              value={row.nome_exibicao || ''}
              onChange={e => setRow(r => r ? { ...r, nome_exibicao: e.target.value } : r)}
              style={{ width: '100%', padding: 10, border: '1px solid var(--border)', borderRadius: 10 }}
            />
          </div>
          <div>
            <label className="muted">Papel</label>
            <select
              value={row.papel || 'externo'}
              onChange={e => setRow(r => r ? { ...r, papel: e.target.value as Papel } : r)}
              style={{ width: '100%', padding: 10, border: '1px solid var(--border)', borderRadius: 10, background: '#fff' }}
            >
              <option value="externo">Externo</option>
              <option value="gestor">Gestor</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'A guardar…' : 'Guardar'}</button>
            <a className="btn btn-ghost" href="/adm/utilizadores">Cancelar</a>
          </div>
        </section>
      )}
    </main>
  );
}
