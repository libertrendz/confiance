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

function summarizeMeta(meta: any) {
  if (!meta || typeof meta !== 'object') {
    return {
      foto: null as boolean | null,
      geo: null as boolean | null,
      raio: null as 'ok' | 'fora' | 'nao_validado' | null,
      origem: null as string | null,
    };
  }

  const foto = meta.foto_capturada === true;

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

  return { foto, geo, raio, origem };
}

function formatWhen(r: PontoRow) {
  const d = r.batida_at || r.created_at || null;
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString();
  } catch {
    return '—';
  }
}

export default function PontoHistoricoPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [rows, setRows] = useState<PontoRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: ud } = await supa.auth.getUser();
        const user = ud.user;
        const uid = user?.id ?? null;
        if (!uid) {
          if (alive) {
            setErr('Sessão expirada. Faça login novamente.');
            setRows([]);
          }
          return;
        }

        setLoading(true);
        const { data, error } = await supa
          .from('ponto_registro')
          .select('*')
          .eq('usuario_id', uid)
          // IMPORTANTÍSSIMO: created_at garante ordenação correta mesmo quando batida_at vem null
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        if (alive) setRows((data as PontoRow[]) || []);
      } catch (e: any) {
        console.error('Erro ao carregar histórico de ponto', e);
        if (alive) {
          setErr(e?.message || 'Falha ao carregar histórico.');
          setRows([]);
        }
      } finally {
        if (alive) {
          setLoading(false);
          setReady(true);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [supa]);

  if (!ready && !err) {
    return (
      <main style={{ padding: 16, fontFamily: 'system-ui' }}>
        <p style={{ color: '#666' }}>A carregar…</p>
      </main>
    );
  }

  return (
    <main
      style={{
        padding: 16,
        fontFamily: 'system-ui',
        maxWidth: 1100,
        margin: '0 auto',
      }}
    >
      {/* HEADER COM LOGO + VOLTAR */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 12,
        }}
      >
        <img
          src="https://cfremxfgqehqnbqummti.supabase.co/storage/v1/object/public/images/app-novo.png"
          alt="CONFIANCE"
          style={{ height: 28, width: 'auto', display: 'block' }}
        />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              color: '#6b7280',
              lineHeight: 1.1,
            }}
          >
            Confiance
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 900,
              color: '#0e3258',
              lineHeight: 1.1,
            }}
          >
            Histórico de ponto
          </div>
        </div>

        <a
          href="/menu"
          className="btn btn-ghost"
          style={{
            marginLeft: 'auto',
            textDecoration: 'none',
            padding: '8px 12px',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: '#fff',
            color: '#0e3258',
            fontWeight: 700,
            fontSize: 13,
            whiteSpace: 'nowrap',
          }}
        >
          ← Voltar
        </a>
      </header>

      {/* Subheader original (mantido) */}
      <header style={{ marginBottom: 12 }}>
        <p
          style={{
            margin: '4px 0 0 0',
            fontSize: 13,
            color: '#49546A',
          }}
        >
          Consulte as últimas marcações de entrada e saída registadas no sistema.
        </p>
      </header>

      <section
        className="card"
        style={{
          border: '1px solid #E9EEF7',
          borderRadius: 16,
          padding: 16,
          background: '#fff',
          boxShadow: '0 1px 0 rgba(14,50,88,0.06)',
        }}
      >
        {err && <p style={{ color: 'crimson', marginBottom: 8 }}>{err}</p>}

        {!rows?.length && !loading && !err && (
          <p className="muted" style={{ color: '#666' }}>
            Ainda não há registos de ponto.
          </p>
        )}

        {!!rows?.length && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rows.map((r) => {
              const s = summarizeMeta(r.meta);
              return (
                <article
                  key={r.id}
                  style={{
                    border: '1px solid #E9EEF7',
                    borderRadius: 12,
                    padding: 12,
                    background: '#F9FBFF',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 8,
                      alignItems: 'center',
                      marginBottom: 6,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: '#0e3258',
                          textTransform: 'capitalize',
                        }}
                      >
                        {r.tipo || '—'}
                      </div>
                      <div style={{ fontSize: 12, color: '#58627A' }}>{formatWhen(r)}</div>
                    </div>

                    <div
                      style={{
                        fontSize: 11,
                        padding: '4px 8px',
                        borderRadius: 999,
                        border: '1px solid #D7E3FF',
                        background: '#EEF3FF',
                        color: '#0e3258',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Registo #{r.id.slice(0, 8)}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: 4,
                      fontSize: 12,
                      color: '#3F4A5F',
                    }}
                  >
                    <div>
                      <strong>Foto no local:</strong> {s.foto === null ? '—' : s.foto ? 'Sim' : 'Não'}
                    </div>
                    <div>
                      <strong>Geo registado:</strong> {s.geo === null ? '—' : s.geo ? 'Sim' : 'Não'}
                    </div>
                    <div>
                      <strong>Validação de raio:</strong>{' '}
                      {s.raio === 'ok'
                        ? 'OK'
                        : s.raio === 'fora'
                        ? 'Fora do raio'
                        : s.raio === 'nao_validado'
                        ? 'Não validado'
                        : '—'}
                    </div>
                    {s.origem && (
                      <div>
                        <strong>Origem:</strong> {s.origem}
                      </div>
                    )}
                  </div>

                  <details style={{ marginTop: 6 }}>
                    <summary style={{ cursor: 'pointer', fontSize: 11, color: '#445' }}>
                      Ver detalhes técnicos
                    </summary>
                    <pre
                      style={{
                        margin: 0,
                        marginTop: 4,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontFamily: 'monospace',
                        fontSize: 11,
                        background: '#fff',
                        padding: 6,
                        borderRadius: 6,
                        border: '1px solid #e0e4f0',
                      }}
                    >
                      {r.meta ? JSON.stringify(r.meta, null, 2) : '{}'}
                    </pre>
                  </details>
                </article>
              );
            })}
          </div>
        )}

        {loading && (
          <p className="muted" style={{ marginTop: 8, color: '#666' }}>
            A carregar histórico…
          </p>
        )}
      </section>
    </main>
  );
}
