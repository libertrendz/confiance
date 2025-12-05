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

type ProfileRow = {
  user_id: string;
  nome: string | null;
  nome_exibicao: string | null;
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

export default function PontoAdmPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [rows, setRows] = useState<PontoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // mapa user_id -> nome exibido
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    setErr(null);
    setRows([]);
    setUserNames({});

    try {
      // 1) carregar últimos registos de ponto (global – admin)
      const { data, error } = await supa
        .from('ponto_registro')
        .select('*')
        .order('batida_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      const pontos = (data || []) as PontoRow[];
      setRows(pontos);

      // 2) extrair user_ids únicos para mapear nomes em profiles
      const userIds = Array.from(
        new Set(
          pontos
            .map((r) => r.usuario_id)
            .filter((id): id is string => !!id)
        )
      );

      if (userIds.length) {
        const { data: perf, error: perfErr } = await supa
          .from('profiles')
          .select('user_id, nome, nome_exibicao')
          .in('user_id', userIds);

        if (perfErr) {
          // não bloqueia página – só loga
          console.warn('Falha ao carregar nomes de profiles para ponto_adm', perfErr);
        } else if (perf && perf.length) {
          const map: Record<string, string> = {};
          (perf as ProfileRow[]).forEach((p) => {
            const display = p.nome_exibicao || p.nome || '';
            if (display) {
              map[p.user_id] = display;
            }
          });
          setUserNames(map);
        }
      }
    } catch (e: any) {
      console.error('Erro ao carregar ponto_registro (adm)', e);
      setErr(e?.message || 'Falha ao carregar registos de ponto.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function getUserName(usuarioId: string): string {
    return userNames[usuarioId] || usuarioId || '—';
  }

  return (
    <main style={{ padding: 18 }}>
      {/* LOGO + título do módulo */}
      <header
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
            Administração · Ponto
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h1 className="h1" style={{ margin: 0 }}>
            Registos de ponto
          </h1>
          <button className="btn btn-ghost" onClick={load} disabled={loading}>
            {loading ? 'A carregar…' : 'Recarregar'}
          </button>
        </div>
      </header>

      <section className="card">
        {err && (
          <p style={{ color: 'crimson', marginBottom: 8 }}>
            {err}
          </p>
        )}

        {!rows.length && !loading && !err && (
          <p className="muted">Sem registos de ponto.</p>
        )}

        {!!rows.length && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: 8 }}>Data / Hora</th>
                  <th style={{ padding: 8 }}>Tipo</th>
                  <th style={{ padding: 8 }}>Utilizador</th>
                  <th style={{ padding: 8 }}>Empresa (ID)</th>
                  <th style={{ padding: 8 }}>Meta</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: 8 }}>
                      {r.batida_at
                        ? new Date(r.batida_at).toLocaleString()
                        : '—'}
                    </td>
                    <td style={{ padding: 8 }}>{labelTipo(r.tipo)}</td>
                    <td style={{ padding: 8 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontWeight: 600 }}>
                          {getUserName(r.usuario_id)}
                        </span>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: 11,
                            color: '#6b7280',
                          }}
                        >
                          {r.usuario_id}
                        </span>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: 8,
                        fontFamily: 'monospace',
                        fontSize: 12,
                      }}
                    >
                      {r.empresa_id}
                    </td>
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
