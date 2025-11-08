// app/adm/utilizadores/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

type Papel = 'admin' | 'gestor' | 'externo';

type ProfileRow = {
  id: string;
  user_id: string;
  empresa_id: string | null;
  papel: Papel;
  nome: string | null;
  nome_exibicao: string | null;
  created_at: string;
  updated_at: string;
};

export default function UtilizadoresAdminPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [token, setToken] = useState<string>('');
  const [meOk, setMeOk] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  // convite form
  const [cvEmail, setCvEmail] = useState('');
  const [cvNome, setCvNome] = useState('');
  const [cvPapel, setCvPapel] = useState<Papel>('externo');
  const [cvBusy, setCvBusy] = useState(false);

  // edição simples
  const [edit, setEdit] = useState<{ user_id: string; nome: string; nome_exibicao: string | null; papel: Papel } | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await supa.auth.getSession();
        const t = data.session?.access_token || '';
        if (!alive) return;
        setToken(t);
        setMeOk(!!t);
        await loadList(t);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || 'Falha ao carregar.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [supa]);

  async function loadList(access: string) {
    setErr(null);
    const r = await fetch('/api/admin/users/list', {
      headers: access ? { Authorization: `Bearer ${access}` } : {},
      cache: 'no-store',
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErr(j?.error || `Erro ${r.status}`);
      setRows([]);
      return;
    }
    const j = await r.json();
    setRows(j.items || []);
  }

  async function convidar() {
    setCvBusy(true);
    setErr(null);
    try {
      const r = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email: cvEmail.trim(), nome: cvNome.trim(), papel: cvPapel }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.detail || j?.error || 'Falha na criação');
      setCvEmail(''); setCvNome(''); setCvPapel('externo');
      await loadList(token);
      alert('Convite enviado. O utilizador deve confirmar por email.');
    } catch (e: any) {
      setErr(e?.message || 'Falha ao convidar');
    } finally {
      setCvBusy(false);
    }
  }

  function startEdit(p: ProfileRow) {
    setEdit({
      user_id: p.user_id,
      nome: p.nome || '',
      nome_exibicao: p.nome_exibicao || '',
      papel: p.papel,
    });
  }

  async function salvarEdicao() {
    if (!edit) return;
    setSaveBusy(true);
    setErr(null);
    try {
      const r = await fetch('/api/admin/users/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(edit),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.detail || j?.error || 'Falha ao salvar');
      setEdit(null);
      await loadList(token);
    } catch (e: any) {
      setErr(e?.message || 'Falha ao salvar');
    } finally {
      setSaveBusy(false);
    }
  }

  return (
    <main style={{ padding: 18, fontFamily: 'system-ui', maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10, color: '#0e3258' }}>Utilizadores</h1>

      {err && <p style={{ color: 'crimson', marginBottom: 8 }}>{err}</p>}
      {!meOk && !loading && <p style={{ color: 'crimson' }}>no_session</p>}

      {/* Convite */}
      <section style={{ border: '1px solid #E9EEF7', borderRadius: 12, padding: 12, marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Convidar utilizador</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 160px 120px', gap: 8, marginTop: 10 }}>
          <input placeholder="Email" value={cvEmail} onChange={e => setCvEmail(e.target.value)} />
          <input placeholder="Nome" value={cvNome} onChange={e => setCvNome(e.target.value)} />
          <select value={cvPapel} onChange={e => setCvPapel(e.target.value as Papel)}>
            <option value="externo">Externo</option>
            <option value="gestor">Gestor</option>
            <option value="admin">Admin</option>
          </select>
          <button onClick={convidar} disabled={cvBusy || !cvEmail.trim()}>
            {cvBusy ? 'A enviar…' : 'Convidar'}
          </button>
        </div>
      </section>

      {/* Lista */}
      <section style={{ border: '1px solid #E9EEF7', borderRadius: 12, padding: 12 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Lista</h2>
        {loading ? (
          <p style={{ color: '#666' }}>A carregar…</p>
        ) : rows.length === 0 ? (
          <p style={{ color: '#666' }}>Sem registos.</p>
        ) : (
          <table style={{ width: '100%', marginTop: 10, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                <th style={{ padding: 8 }}>Nome</th>
                <th style={{ padding: 8 }}>Nome de exibição</th>
                <th style={{ padding: 8 }}>Papel</th>
                <th style={{ padding: 8, width: 1 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.user_id} style={{ borderBottom: '1px solid #f3f5fa' }}>
                  <td style={{ padding: 8 }}>{p.nome || '—'}</td>
                  <td style={{ padding: 8 }}>{p.nome_exibicao || '—'}</td>
                  <td style={{ padding: 8, textTransform: 'uppercase' }}>{p.papel}</td>
                  <td style={{ padding: 8 }}>
                    <button onClick={() => startEdit(p)}>Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Modal tosca de edição */}
      {edit && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ background: '#fff', padding: 16, borderRadius: 12, width: 420 }}>
            <h3 style={{ marginTop: 0 }}>Editar utilizador</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              <input
                placeholder="Nome"
                value={edit.nome}
                onChange={e => setEdit({ ...edit, nome: e.target.value })}
              />
              <input
                placeholder="Nome de exibição"
                value={edit.nome_exibicao || ''}
                onChange={e => setEdit({ ...edit, nome_exibicao: e.target.value })}
              />
              <select
                value={edit.papel}
                onChange={e => setEdit({ ...edit, papel: e.target.value as Papel })}
              >
                <option value="externo">Externo</option>
                <option value="gestor">Gestor</option>
                <option value="admin">Admin</option>
              </select>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button onClick={() => setEdit(null)} disabled={saveBusy}>Cancelar</button>
                <button onClick={salvarEdicao} disabled={saveBusy}>
                  {saveBusy ? 'A guardar…' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
