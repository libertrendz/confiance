// app/adm/utilizadores/[id]/edit/page.tsx

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import getBrowserSupabase from '@/lib/supa';

type Papel = 'admin' | 'gestor' | 'externo';

type Row = {
  user_id: string;
  email: string | null;
  last_sign_in_at: string | null;
  papel: Papel | null;
  empresa_id: string | null;
  nome: string | null;
  nome_exibicao: string | null;
  created_at: string | null;
  updated_at: string | null;
  profile_id: string | null;
};

export default function EditUtilizadorPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supa = useMemo(() => getBrowserSupabase(), []);
  const id = params?.id;

  const [row, setRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!id) throw new Error('ID em falta.');
        const res = await fetch(`/api/admin/users/read?id=${encodeURIComponent(id)}`, {
          cache: 'no-store',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Falha ao carregar');
        if (alive) setRow(data as Row);
      } catch (e: any) {
        setErr(e?.message || 'Falha ao carregar');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, supa]);

  async function guardar() {
    if (!row) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch('/api/admin/users/update', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          // chave de admin para falar com a rota protegida
          'x-admin-secret': process.env.NEXT_PUBLIC_API_ADMIN_SECRET ?? '',
        },
        body: JSON.stringify({
          userId: row.user_id,
          empresaId: row.empresa_id,
          updates: {
            nome: row.nome ?? '', // nome canónico (vai espelhar em nome_exibicao no backend)
            papel: (row.papel || 'externo') as Papel,
          },
        }),
      });

      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Falha ao guardar');
      router.replace('/adm/utilizadores');
    } catch (e: any) {
      setErr(e?.message || 'Falha ao guardar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main style={{ padding: 18 }}>
        <p style={{ color: '#666' }}>A carregar…</p>
      </main>
    );
  }

  if (err) {
    return (
      <main style={{ padding: 18 }}>
        <p style={{ color: 'crimson' }}>{err}</p>
        <a className="btn btn-ghost" href="/adm/utilizadores" style={{ marginTop: 8 }}>
          Voltar
        </a>
      </main>
    );
  }

  if (!row) {
    return (
      <main style={{ padding: 18 }}>
        <p style={{ color: '#666' }}>Registo não encontrado.</p>
        <a className="btn btn-ghost" href="/adm/utilizadores" style={{ marginTop: 8 }}>
          Voltar
        </a>
      </main>
    );
  }

  return (
    <main style={{ padding: 18 }}>
      <h1 className="h1" style={{ marginBottom: 12 }}>Editar utilizador</h1>
      <section className="card" style={{ display: 'grid', gap: 12, maxWidth: 720 }}>
        <div>
          <label className="muted">Email</label>
          <input value={row.email || ''} readOnly style={input} />
        </div>
        <div>
          <label className="muted">Nome</label>
          <input
            value={row.nome || ''}
            onChange={e => setRow(r => (r ? { ...r, nome: e.target.value } : r))}
            style={input}
          />
        </div>
        <div>
          <label className="muted">Papel</label>
          <select
            value={row.papel || 'externo'}
            onChange={e => setRow(r => (r ? { ...r, papel: e.target.value as Papel } : r))}
            style={input}
          >
            <option value="externo">Externo</option>
            <option value="gestor">Gestor</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {err && <p style={{ color: 'crimson' }}>{err}</p>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={guardar} disabled={saving}>
            {saving ? 'A guardar…' : 'Guardar'}
          </button>
          <a className="btn btn-ghost" href="/adm/utilizadores">
            Cancelar
          </a>
        </div>
      </section>
    </main>
  );
}

const input: React.CSSProperties = {
  width: '100%',
  padding: 10,
  border: '1px solid var(--border)',
  borderRadius: 10,
  background: '#fff',
};
