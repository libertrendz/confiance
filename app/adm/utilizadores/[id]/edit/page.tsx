// app/adm/utilizadores/[id]/edit/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import getBrowserSupabase from '@/lib/supa';

type Papel = 'externo' | 'gestor' | 'admin';

export default function EditUtilizadorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [papel, setPapel] = useState<Papel>('externo');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string|null>(null);
  const [msg, setMsg] = useState<string|null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supa.auth.getSession();
        const token = session?.access_token!;
        const res = await fetch(`/api/admin/users/get?id=${encodeURIComponent(String(id))}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.details || json?.error);
        if (!alive) return;
        setNome(json.nome || '');
        setEmail(json.email || '');
        setPapel((json.papel || 'externo') as Papel);
      } catch (e:any) {
        setErr(e?.message || 'Erro ao carregar');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id, supa]);

  async function salvar(ev: React.FormEvent) {
    ev.preventDefault();
    setErr(null); setMsg(null);
    try {
      const { data: { session } } = await supa.auth.getSession();
      const token = session?.access_token!;
      const res = await fetch('/api/admin/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_id: id, nome, papel }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.details || json?.error);
      setMsg('Guardado com sucesso.');
    } catch (e:any) {
      setErr(e?.message || 'Erro ao guardar');
    }
  }

  return (
    <main style={{ padding: 16, fontFamily: 'system-ui', maxWidth: 520, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Editar Utilizador</h1>

      {loading && <p>A carregar…</p>}
      {err && <p style={{ color: 'crimson' }}>{err}</p>}

      {!loading && !err && (
        <form onSubmit={salvar}>
          <label>Nome</label>
          <input
            type="text"
            value={nome}
            onChange={e => setNome(e.target.value)}
            style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 8, margin: '6px 0 12px' }}
          />

          <label>Email</label>
          <input
            type="email"
            value={email}
            readOnly
            style={{ width: '100%', padding: 10, border: '1px solid #eee', background: '#fafafa', borderRadius: 8, margin: '6px 0 12px' }}
          />

          <label>Papel</label>
          <select
            value={papel}
            onChange={e => setPapel(e.target.value as any)}
            style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 8, margin: '6px 0 16px' }}
          >
            <option value="externo">externo</option>
            <option value="gestor">gestor</option>
            <option value="admin">admin</option>
          </select>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" style={{ padding: '10px 14px', borderRadius: 10, border: 'none', background: '#0A3D91', color:'#fff' }}>
              Guardar
            </button>
            <button type="button" onClick={() => router.push('/adm/utilizadores')} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #ddd', background: '#fff' }}>
              Voltar
            </button>
          </div>

          {msg && <p style={{ color: 'green', marginTop: 12 }}>{msg}</p>}
        </form>
      )}
    </main>
  );
}
