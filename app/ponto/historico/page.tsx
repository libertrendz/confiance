// app/ponto/historico/page.tsx
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

function labelTipo(t: string | null | undefined): string {
  switch (t) {
    case 'entrada':
      return 'Entrada';
    case 'saida_almoco':
      return 'Saída para almoço';
    case 'retorno_almoco':
      return 'Retorno do almoço';
    case 'saida':
      return 'Saída';
    case 'in':
      return 'In (legacy)';
    case 'out':
      return 'Out (legacy)';
    default:
      return t || '—';
  }
}

export default function PontoHistoricoPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [nome, setNome] = useState<string | null>(null);

  const [rows, setRows] = useState<PontoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function carregar() {
    if (!usuarioId || !empresaId) return;
    setLoading(true);
    setErr(null);
    try {
      const { data, error } = await supa
        .from('ponto_registro')
        .select('*')
        .eq('usuario_id', usuarioId)
        .eq('empresa_id', empresaId)
        .order('batida_at', { ascending: false });

      if (error) throw error;
      setRows((data || []) as PontoRow[]);
    } catch (e: any) {
      console.error('Erro ao carregar histórico de ponto', e);
      setErr(e?.message || 'Falha ao carregar histórico de ponto.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const { data: authData, error: authError } = await supa.auth.getUser();
        if (authError) throw authError;
        if (!authData?.user) {
          throw new Error('Sessão expirada. Faça login novamente.');
        }

        const user = authData.user;
        const uid = user.id;
        if (!alive) return;

        setUsuarioId(uid);

        const { data: profile, error: profError } = await supa
          .from('profiles')
          .select('empresa_id, nome_exibicao, nome')
          .eq('user_id', uid)
          .maybeSingle();

        if (profError) throw profError;
        if (!profile) throw new Error('Perfil não encontrado.');

        setEmpresaId(profile.empresa_id);
        setNome(profile.nome_exibicao || profile.nome || null);
      } catch (e: any) {
        console.error('Erro ao carregar utilizador/empresa para histórico', e);
        setErr(e?.message || 'Falha ao carregar dados do utilizador.');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [supa]);

  useEffect(() => {
    if (usuarioId && empresaId) {
      carregar();
    }
  }, [usuarioId, empresaId]);

  return (
    <main style={{ padding: 18 }}>
      {/* Logo + título */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
        }}
      >
        <img
          src="https://cfremxfgqehqnbqummti.supabase.co/storage/v1/object/public/images/app-novo.png"
          alt="CONFIANCE"
          style={{ height: 28 }}
        />
        <span
          style={{
            fontSize: 11,
            textTransform: 'uppercase',
            color: '#6b7280',
          }}
        >
          Histórico de Ponto
        </span>
      </header>

      <section className="card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <div>
            <h1 className="h1" style={{ marginBottom: 4 }}>
              Histórico
            </h1>
            {nome && (
              <p className="muted" style={{ margin: 0 }}>
                Utilizador: <strong>{nome}</strong>
              </p>
            )}
          </div>
          <button
            className="btn btn-ghost"
            onClick={carregar}
            disabled={loading || !usuarioId || !empresaId}
          >
            {loading ? 'A carregar…' : 'Recarregar'}
          </button>
        </div>

        {err && (
          <p style={{ color: 'crimson', marginBottom: 8 }}>{err}</p>
        )}

        {!err && !rows.length && !loading && (
          <p className="muted">Ainda não há registos de ponto.</p>
        )}

        {!!rows.length && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: 8 }}>Data / Hora</th>
                  <th style={{ padding: 8 }}>Tipo</th>
                  <th style={{ padding: 8 }}>Meta</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: 8 }}>
                      {r.batida_at ? new Date(r.batida_at).toLocaleString() : '—'}
                    </td>
                    <td style={{ padding: 8 }}>{labelTipo(r.tipo)}</td>
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

        {loading && (
          <p className="muted" style={{ marginTop: 8 }}>
            A carregar registos…
          </p>
        )}
      </section>
    </main>
  );
}
