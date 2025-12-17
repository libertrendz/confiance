// app/adm/ponto/page.tsx
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

  // vindo da VIEW
  usuario_nome: string | null;
  empresa_nome: string | null;
};

function summarizeMeta(meta: any) {
  if (!meta || typeof meta !== 'object') {
    return {
      foto: null as boolean | null,
      geo: null as boolean | null,
      raio: null as 'ok' | 'fora' | 'nao_validado' | null,
      origem: null as string | null,
      foto_url: null as string | null,
    };
  }

  const foto =
    meta.foto_capturada === true ||
    typeof meta.foto_url === 'string' ||
    typeof meta.foto_path === 'string' ||
    meta.foto_checkin === true ||
    meta.foto_checkout === true ||
    meta.foto_saida_almoco === true ||
    meta.foto_retorno_almoco === true;

  const geo =
    typeof meta.lat === 'number' &&
    !Number.isNaN(meta.lat) &&
    typeof meta.lon === 'number' &&
    !Number.isNaN(meta.lon);

  let raio: 'ok' | 'fora' | 'nao_validado' | null = null;
  if (meta.raio_ok === true) raio = 'ok';
  else if (meta.raio_ok === false) raio = 'fora';
  else raio = 'nao_validado';

  const origem = (meta.origem as string) || (meta.device as string) || null;
  const foto_url = typeof meta.foto_url === 'string' ? meta.foto_url : null;

  return { foto, geo, raio, origem, foto_url };
}

export default function PontoAdmPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [rows, setRows] = useState<PontoRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const { data, error } = await supa
        .from('v_adm_ponto_registros')
        .select('*')
        .order('batida_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setRows((data as PontoRow[]) || []);
    } catch (e: any) {
      console.error('Erro ao carregar v_adm_ponto_registros', e);
      setErr(e?.message || 'Falha ao carregar registos de ponto.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ padding: 18 }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <h1 className="h1">Registos de ponto</h1>
        <button className="btn btn-ghost" onClick={load} disabled={loading}>
          {loading ? 'A carregar…' : 'Recarregar'}
        </button>
      </header>

      <section className="card">
        {err && <p style={{ color: 'crimson', marginBottom: 8 }}>{err}</p>}

        {!rows?.length && !loading && !err && <p className="muted">Sem registos de ponto.</p>}

        {!!rows?.length && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: 8 }}>Data / Hora</th>
                  <th style={{ padding: 8 }}>Tipo</th>
                  <th style={{ padding: 8 }}>Colaborador</th>
                  <th style={{ padding: 8 }}>Empresa</th>
                  <th style={{ padding: 8 }}>Resumo (meta)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const s = summarizeMeta(r.meta);
                  return (
                    <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: 8 }}>
                        {r.batida_at ? new Date(r.batida_at).toLocaleString() : '—'}
                      </td>

                      <td style={{ padding: 8 }}>{r.tipo || '—'}</td>

                      <td style={{ padding: 8 }}>
                        <div style={{ fontWeight: 700, color: '#0e3258' }}>
                          {r.usuario_nome || '—'}
                        </div>
                        <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#667085' }}>
                          {r.usuario_id}
                        </div>
                      </td>

                      <td style={{ padding: 8 }}>
                        <div style={{ fontWeight: 700, color: '#0e3258' }}>
                          {r.empresa_nome || '—'}
                        </div>
                        <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#667085' }}>
                          {r.empresa_id}
                        </div>
                      </td>

                      <td style={{ padding: 8, fontSize: 12 }}>
                        <div style={{ lineHeight: 1.4 }}>
                          <div>
                            Foto no local: {s.foto === null ? '—' : s.foto ? 'Sim' : 'Não'}
                          </div>
                          <div>
                            Geo registado: {s.geo === null ? '—' : s.geo ? 'Sim' : 'Não'}
                          </div>
                          <div>
                            Validação de raio:{' '}
                            {s.raio === 'ok'
                              ? 'OK'
                              : s.raio === 'fora'
                              ? 'Fora do raio'
                              : s.raio === 'nao_validado'
                              ? 'Não validado'
                              : '—'}
                          </div>
                          {s.origem && <div>Origem: {s.origem}</div>}

                          {/* Auditoria imediata */}
                          {s.foto_url && (
                            <div style={{ marginTop: 6 }}>
                              <a href={s.foto_url} target="_blank" rel="noreferrer">
                                Ver foto
                              </a>
                            </div>
                          )}
                        </div>

                        <details style={{ marginTop: 4 }}>
                          <summary style={{ cursor: 'pointer', fontSize: 11, color: '#445' }}>
                            Ver JSON completo
                          </summary>
                          <pre
                            style={{
                              margin: 0,
                              marginTop: 4,
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              fontFamily: 'monospace',
                              fontSize: 11,
                              background: '#f7f8fb',
                              padding: 6,
                              borderRadius: 6,
                              border: '1px solid #e0e4f0',
                            }}
                          >
                            {r.meta ? JSON.stringify(r.meta, null, 2) : '{}'}
                          </pre>
                        </details>
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
