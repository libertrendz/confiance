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
      foto_bucket: null as string | null,
      foto_path: null as string | null,
      geo: null as boolean | null,
      raio: null as 'ok' | 'fora' | 'nao_validado' | null,
      origem: null as string | null,
      roteiro: null as string | null,
    };
  }

  const foto_bucket = (meta.foto_bucket as string) || null;
  const foto_path = (meta.foto_path as string) || null;
  const foto = !!foto_bucket && !!foto_path;

  const geo =
    typeof meta.lat === 'number' &&
    !Number.isNaN(meta.lat) &&
    typeof meta.lon === 'number' &&
    !Number.isNaN(meta.lon);

  // compatibilidade: alguns fluxos tinham raio_ok, outros só texto em raio_validacao
  let raio: 'ok' | 'fora' | 'nao_validado' | null = null;
  if (meta.raio_ok === true) raio = 'ok';
  else if (meta.raio_ok === false) raio = 'fora';
  else if (typeof meta.raio_validacao === 'string') {
    const txt = String(meta.raio_validacao).toLowerCase();
    if (txt.includes('dentro')) raio = 'ok';
    else if (txt.includes('fora')) raio = 'fora';
    else raio = 'nao_validado';
  } else {
    raio = 'nao_validado';
  }

  const origem = (meta.origem as string) || (meta.device as string) || null;
  const roteiro = (meta.roteiro_id as string) || null;

  return { foto, foto_bucket, foto_path, geo, raio, origem, roteiro };
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

function tipoLabel(t: string) {
  switch (t) {
    case 'entrada':
      return 'Check-in';
    case 'saida_almoco':
      return 'Saída almoço';
    case 'retorno_almoco':
      return 'Retorno almoço';
    case 'saida':
      return 'Check-out';
    default:
      return t || '—';
  }
}

export default function PontoHistoricoPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [rows, setRows] = useState<PontoRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  async function abrirFoto(bucket: string, path: string) {
    try {
      const { data, error } = await supa.storage.from(bucket).createSignedUrl(path, 60 * 10);
      if (error) throw error;
      const url = data?.signedUrl;
      if (!url) throw new Error('Não foi possível gerar URL.');
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      alert(e?.message || 'Falha ao abrir a foto.');
    }
  }

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
          .order('created_at', { ascending: false })
          .limit(80);

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

      <header style={{ marginBottom: 12 }}>
        <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#49546A' }}>
          Consulte as últimas marcações registadas no sistema.
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
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#0e3258' }}>
                        {tipoLabel(r.tipo || '—')}
                      </div>
                      <div style={{ fontSize: 12, color: '#58627A' }}>{formatWhen(r)}</div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {s.foto && s.foto_bucket && s.foto_path && (
                        <button
                          className="btn btn-ghost"
                          type="button"
                          onClick={() => abrirFoto(s.foto_bucket!, s.foto_path!)}
                        >
                          Ver foto
                        </button>
                      )}

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
                        #{r.id.slice(0, 8)}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                      gap: 4,
                      fontSize: 12,
                      color: '#3F4A5F',
                    }}
                  >
                    <div>
                      <strong>Foto:</strong> {s.foto === null ? '—' : s.foto ? 'Sim' : 'Não'}
                    </div>
                    <div>
                      <strong>Geo:</strong> {s.geo === null ? '—' : s.geo ? 'Sim' : 'Não'}
                    </div>
                    <div>
                      <strong>Raio:</strong>{' '}
                      {s.raio === 'ok'
                        ? 'OK'
                        : s.raio === 'fora'
                        ? 'Fora'
                        : s.raio === 'nao_validado'
                        ? 'Não validado'
                        : '—'}
                    </div>
                    {s.origem && (
                      <div>
                        <strong>Origem:</strong> {s.origem}
                      </div>
                    )}
                    {s.roteiro && (
                      <div>
                        <strong>Roteiro:</strong> {String(s.roteiro).slice(0, 8)}…
                      </div>
                    )}
                  </div>

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
