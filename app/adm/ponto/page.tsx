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

type NomeMap = Record<string, string>;

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
  const [colabByUserId, setColabByUserId] = useState<NomeMap>({});
  const [empresaById, setEmpresaById] = useState<NomeMap>({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      // 1) Carrega os registos de ponto (respeita RLS: empresa_id do admin)
      const { data, error } = await supa
        .from('ponto_registro')
        .select('*')
        .order('batida_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      const baseRows = (data || []) as PontoRow[];
      setRows(baseRows);

      if (!baseRows.length) {
        setColabByUserId({});
        setEmpresaById({});
        return;
      }

      // 2) Extrai IDs únicos de utilizador e empresa
      const userIds = Array.from(
        new Set(
          baseRows
            .map((r) => r.usuario_id)
            .filter((v): v is string => !!v)
        )
      );
      const empresaIds = Array.from(
        new Set(
          baseRows
            .map((r) => r.empresa_id)
            .filter((v): v is string => !!v)
        )
      );

      // 3) Carrega nomes dos colaboradores (profiles) e empresas
      const [profRes, empRes] = await Promise.all([
        userIds.length
          ? supa
              .from('profiles')
              .select('user_id, nome_exibicao, nome')
              .in('user_id', userIds)
          : Promise.resolve({ data: [] as any[], error: null } as const),
        empresaIds.length
          ? supa
              .from('empresas')
              .select('id, nome')
              .in('id', empresaIds)
          : Promise.resolve({ data: [] as any[], error: null } as const),
      ]);

      // 4) Monta mapas de nome → id
      if (profRes.error) {
        console.warn('Falha ao carregar perfis para ponto ADM:', profRes.error);
      } else if (profRes.data) {
        const map: NomeMap = {};
        (profRes.data as any[]).forEach((p) => {
          const uid = p.user_id as string;
          const nome =
            (p.nome_exibicao as string | null) ||
            (p.nome as string | null) ||
            uid;
          if (uid) {
            map[uid] = nome;
          }
        });
        setColabByUserId(map);
      } else {
        setColabByUserId({});
      }

      if (empRes.error) {
        console.warn('Falha ao carregar empresas para ponto ADM:', empRes.error);
      } else if (empRes.data) {
        const map: NomeMap = {};
        (empRes.data as any[]).forEach((e) => {
          const id = e.id as string;
          const nome = (e.nome as string | null) || id;
          if (id) {
            map[id] = nome;
          }
        });
        setEmpresaById(map);
      } else {
        setEmpresaById({});
      }
    } catch (e: any) {
      console.error('Erro ao carregar ponto_registro (ADM)', e);
      setErr(e?.message || 'Falha ao carregar registos de ponto.');
      setRows([]);
      setColabByUserId({});
      setEmpresaById({});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main style={{ padding: 18 }}>
      {/* Cabeçalho com logo + título + botão recarregar */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src="https://cfremxfgqehqnbqummti.supabase.co/storage/v1/object/public/images/app-novo.png"
            alt="CONFIANCE"
            style={{ height: 28 }}
          />
          <div>
            <h1 className="h1" style={{ marginBottom: 2 }}>
              Registos de ponto
            </h1>
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              Visão administrativa dos registos de ponto (máx. 200 mais recentes).
            </p>
          </div>
        </div>

        <button className="btn btn-ghost" onClick={load} disabled={loading}>
          {loading ? 'A carregar…' : 'Recarregar'}
        </button>
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
                  <th style={{ padding: 8 }}>Colaborador</th>
                  <th style={{ padding: 8 }}>Empresa</th>
                  <th style={{ padding: 8 }}>Meta</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const nomeColab =
                    colabByUserId[r.usuario_id] || r.usuario_id || '—';
                  const nomeEmpresa =
                    empresaById[r.empresa_id] || r.empresa_id || '—';

                  return (
                    <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: 8 }}>
                        {r.batida_at
                          ? new Date(r.batida_at).toLocaleString()
                          : '—'}
                      </td>
                      <td style={{ padding: 8 }}>{labelTipo(r.tipo)}</td>
                      <td style={{ padding: 8 }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span>{nomeColab}</span>
                          <span
                            style={{
                              fontSize: 11,
                              color: '#6b7280',
                              fontFamily: 'monospace',
                            }}
                          >
                            {r.usuario_id}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: 8 }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span>{nomeEmpresa}</span>
                          <span
                            style={{
                              fontSize: 11,
                              color: '#6b7280',
                              fontFamily: 'monospace',
                            }}
                          >
                            {r.empresa_id}
                          </span>
                        </div>
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
                  );
                })}
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
