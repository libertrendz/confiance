// app/adm/utilizadores/[id]/edit/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

type Papel = 'admin' | 'gestor' | 'externo';

export default function EditUserPage({ params }: { params: { id: string } }) {
  const userId = params?.id;
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [email, setEmail] = useState<string>('');
  const [nome, setNome] = useState<string>('');
  const [papel, setPapel] = useState<Papel>('externo');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!userId) throw new Error('ID em falta.');
        setErr(null);
        // Lê da view + profiles
        const { data, error } = await supa
          .from('v_adm_users')
          .select('email, nome, nome_exibicao, papel')
          .eq('user_id', userId)
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error('Utilizador não encontrado');

        setEmail(data.email || '');
        setNome(data.nome_exibicao || data.nome || '');
        setPapel((data.papel as Papel) || 'externo');
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || 'Falha ao carregar');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [supa, userId]);

  async function guardar() {
    try {
      setErr(null);
      const payload: any = {
        papel,
        nome: nome || null,
        nome_exibicao: nome || null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supa.from('profiles').upsert(
        { user_id: userId, ...payload },
        { onConflict: 'user_id' }
      );
      if (error) throw error;
      alert('Guardado.');
      window.location.href = '/adm/utilizadores';
    } catch (e: any) {
      setErr(e?.message || 'Falha ao guardar');
    }
  }

  if (loading) return <main style={{ padding: 18 }}><p className="muted">A carregar…</p></main>;
  if (err) return <main style={{ padding: 18 }}><p style={{ color: 'crimson' }}>{err}</p></main>;

  return (
    <main style={{ padding: 18 }}>
      <h1 className="h1" style={{ marginBottom: 12 }}>Editar utilizador</h1>
      <section className="card" style={{ display: 'grid', gap: 12, maxWidth: 560 }}>
        <div>
          <label className="muted">Email</label>
          <input disabled value={email} style={{ width: '100%', padding: 10, border: '1px solid var(--border)', borderRadius: 10 }} />
        </div>
        <div>
          <label className="muted">Nome</label>
          <input value={nome} onChange={e=>setNome(e.target.value)} style={{ width: '100%', padding: 10, border: '1px solid var(--border)', borderRadius: 10 }} />
        </div>
        <div>
          <label className="muted">Papel</label>
          <select value={papel} onChange={e=>setPapel(e.target.value as Papel)} style={{ width: '100%', padding: 10, border: '1px solid var(--border)', borderRadius: 10, background: '#fff' }}>
            <option value="externo">Externo</option>
            <option value="gestor">Gestor</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={guardar}>Guardar</button>
          <a className="btn btn-ghost" href="/adm/utilizadores">Cancelar</a>
        </div>
      </section>
    </main>
  );
}
