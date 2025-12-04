'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

type PontoRow = {
  id: string;
  empresa_id: string;
  usuario_id: string;
  tipo: string;
  meta: any;
  batida_at: string;
  created_at: string;
};

export default function ExternoPontoPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [nome, setNome] = useState<string | null>(null);

  const [tipo, setTipo] = useState<string>('entrada');
  const [loadingUser, setLoadingUser] = useState(true);
  const [batendo, setBatendo] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ultimos, setUltimos] = useState<PontoRow[]>([]);
  const [loadingLista, setLoadingLista] = useState(false);

  // 1) Carregar user + empresa a partir do Supabase auth + profiles
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoadingUser(true);
        setErr(null);
        setMsg(null);

        const { data: authData, error: authError } = await supa.auth.getUser();
        if (authError) throw authError;
        if (!authData?.user) {
          throw new Error('Sessão expirada. Faça login novamente.');
        }

        const user = authData.user;
        const uid = user.id;
        if (!alive) return;

        setUsuarioId(uid);

        // buscar empresa_id + nome no profiles
        const { data: profile, error: profError } = await supa
          .from('profiles')
          .select('empresa_id, nome_exibicao, nome')
          .eq('user_id', uid)
          .maybeSingle();

        if (profError) throw profError;
        if (!profile) {
          throw new Error('Perfil não encontrado. Contacte o administrador.');
        }

        setEmpresaId(profile.empresa_id);
        setNome(profile.nome_exibicao || profile.nome || null);
      } catch (e: any) {
        console.error('Erro ao carregar utilizador/empresa', e);
        if (alive) setErr(e?.message || 'Falha ao carregar dados do utilizador.');
      } finally {
        if (alive) setLoadingUser(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [supa]);

  async function carregarUltimos() {
    if (!usuarioId || !empresaId) return;
    setLoadingLista(true);
    try {
      const { data, error } = await supa
        .from('ponto_registro')
        .select('*')
        .eq('usuario_id', usuarioId)
        .eq('empresa_id', empresaId)
        .order('batida_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setUltimos((data || []) as PontoRow[]);
    } catch (e: any) {
      console.error('Erro ao carregar últimos pontos', e);
    } finally {
      setLoadingLista(false);
    }
  }

  // carregar lista sempre que tivermos user + empresa
  useEffect(() => {
    if (usuarioId && empresaId) {
      carregarUltimos();
    }
  }, [usuarioId, empresaId]);

  // 2) Bater ponto via RPC direto (sem admin secret)
  async function baterPonto() {
    if (!usuarioId || !empresaId) return;
    setBatendo(true);
    setErr(null);
    setMsg(null);
    try {
      const meta = {
        origem: 'externo-web',
        device: 'browser',
      };

      const { data, error } = await supa.rpc('rpc_ponto_bater', {
        p_empresa_id: empresaId,
        p_usuario_id: usuarioId,
        p_tipo: tipo,
        p_meta: meta,
      });

      if (error) throw error;
      setMsg('Ponto registado com sucesso.');
      await carregarUltimos();
    } catch (e: any) {
      console.error('Erro ao bater ponto', e);
      setErr(e?.message || 'Falha ao registar ponto.');
    } finally {
      setBatendo(false);
    }
  }

  if (loadingUser) {
    return (
      <main style={{ padding: 18 }}>
        <p className="muted">A carregar dados do utilizador…</p>
      </main>
    );
  }

  if (err && !usuarioId) {
    return (
      <main style={{ padding: 18 }}>
        <p style={{ color: 'crimson', marginBottom: 8 }}>{err}</p>
        <p className="muted">Tente sair e entrar novamente.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 18 }}>
      <h1 className="h1" style={{ marginBottom: 6 }}>Registo de ponto</h1>
      {nome && (
        <p className="muted" style={{ marginBottom: 16 }}>
          Olá, <strong>{nome}</strong>
        </p>
      )}

      <section className="card" style={{ marginBottom: 16, maxWidth: 480 }}>
        <h2 className="h2" style={{ marginBottom: 12 }}>Bater ponto</h2>

        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label className="muted">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                border: '1px solid var(--border)',
                borderRadius: 10,
                background: '#fff',
              }}
            >
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
              <option value="in">In (legacy)</option>
              <option value="out">Out (legacy)</option>
            </select>
          </div>

          {err && (
            <p style={{ color: 'crimson' }}>{err}</p>
          )}
          {msg && (
            <p style={{ color: 'green' }}>{msg}</p>
          )}

          <button
            className="btn btn-primary"
            onClick={baterPonto}
            disabled={batendo || !usuarioId || !empresaId}
          >
            {batendo ? 'A registar…' : 'Bater ponto'}
          </button>
        </div>
      </section>

      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="h2">Últimos registos</h2>
          <button
            className="btn btn-ghost"
            onClick={carregarUltimos}
            disabled={loadingLista}
          >
            {loadingLista ? 'A carregar…' : 'Recarregar'}
          </button>
        </div>

        {!ultimos.length && !loadingLista && (
          <p className="muted" style={{ marginTop: 8 }}>
            Ainda não há registos de ponto.
          </p>
        )}

        {!!ultimos.length && (
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: 8 }}>Data / Hora</th>
                  <th style={{ padding: 8 }}>Tipo</th>
                  <th style={{ padding: 8 }}>Meta</th>
                </tr>
              </thead>
              <tbody>
                {ultimos.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: 8 }}>
                      {r.batida_at ? new Date(r.batida_at).toLocaleString() : '—'}
                    </td>
                    <td style={{ padding: 8 }}>{r.tipo || '—'}</td>
                    <td style={{ padding: 8, fontSize: 12 }}>
                      <pre
                        style={{
                          margin: 0,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          fontFamily: 'monospace',
                        }}
                      >
                        {r.meta ? JSON.stringify(r.meta) : '{}'}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {loadingLista && (
          <p className="muted" style={{ marginTop: 8 }}>
            A carregar registos…
          </p>
        )}
      </section>
    </main>
  );
}
