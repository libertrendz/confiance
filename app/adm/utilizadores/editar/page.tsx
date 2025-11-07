// app/adm/utilizadores/editar/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

export const dynamic = 'force-dynamic';

type Papel = 'admin' | 'gestor' | 'externo';

export default function EditarUtilizadorPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [id, setId] = useState<string>('');
  const [email, setEmail] = useState<string | null>(null);
  const [nome, setNome] = useState<string>('');
  const [papel, setPapel] = useState<Papel>('externo');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // pega ?id
        const u = new URL(window.location.href);
        const qid = u.searchParams.get('id');
        if (!qid) {
          setErr('Parâmetro ?id em falta.');
          setLoading(false);
          return;
        }
        setId(qid);

        // garante sessão
        const { data: s } = await supa.auth.getSession();
        if (!s.session) {
          window.location.replace('/login');
          return;
        }

        // carrega dados (usa view v_admin_users; demanda admin via funções/rls)
        const { data, error } = await supa
          .from('v_admin_users')
          .select('id, email, nome, papel')
          .eq('id', qid)
          .maybeSingle();

        if (error) throw error;
        if (!alive) return;

        if (!data) {
          setErr('Utilizador não encontrado na sua empresa.');
          return;
        }

        setEmail(data.email);
        setNome(data.nome || '');
        setPapel((data.papel as Papel) || 'externo');
      } catch (e: any) {
        setErr(e?.message ?? 'Falha ao carregar utilizador.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [supa]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    setSaving(true);
    try {
      // chama RPC admin_profile_update (criada no PASSO 1)
      const { error } = await supa.rpc('admin_profile_update', {
        p_user_id: id,
        p_nome: nome.trim() || null,
        p_papel: papel
      });
      if (error) throw error;

      setMsg('Utilizador atualizado com sucesso.');
    } catch (e: any) {
      setErr(e?.message ?? 'Falha ao atualizar utilizador.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ padding: 18, fontFamily: 'system-ui', maxWidth: 560 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#0A3D91' }}>
        Editar utilizador
      </h1>
      {loading && <p style={{ color: '#666' }}>A carregar…</p>}
      {err && <p style={{ color: 'crimson' }}>{err}</p>}

      {!loading && !err && (
        <form onSubmit={guardar}>
          <label>Email</label>
          <input value={email ?? '—'} disabled style={roStyle} />

          <label style={{ marginTop: 12 }}>Nome (exibição)</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            style={inputStyle}
            placeholder="Ex.: João Silva"
          />

          <label style={{ marginTop: 12 }}>Papel</label>
          <select value={papel} onChange={(e) => setPapel(e.target.value as Papel)} style={inputStyle}>
            <option value="externo">Externo (colaborador)</option>
            <option value="gestor">Gestor</option>
            <option value="admin">Administrador</option>
          </select>

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button type="submit" disabled={saving} style={primaryBtnStyle}>
              {saving ? 'A guardar…' : 'Guardar alterações'}
            </button>
            <a href="/adm/utilizadores" style={ghostBtnStyle}>Voltar</a>
          </div>

          {msg && <p style={{ color: 'green', marginTop: 12 }}>{msg}</p>}
          {err && <p style={{ color: 'crimson', marginTop: 12 }}>{err}</p>}
        </form>
      )}
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: 10, borderRadius: 10, border: '1px solid #D7E3FF', marginTop: 6
};
const roStyle: React.CSSProperties = {
  ...inputStyle, background: '#F5F8FF', color: '#666'
};
const primaryBtnStyle: React.CSSProperties = {
  padding: '10px 14px', borderRadius: 10, border: 'none', background: '#0A3D91', color: '#fff', cursor: 'pointer'
};
const ghostBtnStyle: React.CSSProperties = {
  textDecoration: 'none', padding: '10px 14px', borderRadius: 10, border: '1px solid #D7E3FF', background: '#fff', color: '#0A3D91'
};
