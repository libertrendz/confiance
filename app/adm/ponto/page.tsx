'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabase } from '@/lib/supa';

type Ponto = {
  id: string;
  user_id: string | null;
  created_at: string; // timestamp ISO
  latitude: number | null;
  longitude: number | null;
  precisao_m?: number | null;
  origem?: string | null;
  foto_url?: string | null;
  validado?: boolean | null;
};

const PAGE_SIZE = 20;

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function AdmPontoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Filtros
  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState<string>(() => isoDate(today));
  const [to, setTo] = useState<string>(() => isoDate(today));
  const [qUserId, setQUserId] = useState<string>(''); // simples: filtra pelo user_id (sem join em auth.users)

  // Dados
  const [rows, setRows] = useState<Ponto[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState<number>(0);

  const fromISO = useMemo(() => `${from}T00:00:00Z`, [from]);
  const toISO   = useMemo(() => `${to}T23:59:59Z`, [to]);

  useEffect(() => {
    (async () => {
      // Gate: precisa estar logado
      const { data } = await supa.auth.getUser();
      if (!data.user) {
        router.replace('/login?next=' + encodeURIComponent('/adm/ponto'));
        return;
      }
      setAuthChecked(true);
    })();
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;

    (async () => {
      setLoading(true);
      setErr(null);

      try {
        // total (contagem) – usa head com count
        let countQuery = supa
          .from('pontos')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', fromISO)
          .lte('created_at', toISO);

        if (qUserId.trim()) countQuery = countQuery.eq('user_id', qUserId.trim());

        const { count, error: eCount } = await countQuery;
        if (eCount) throw eCount;
        setTotal(count || 0);

        // paginação
        const fromIdx = (page - 1) * PAGE_SIZE;
        const toIdx = fromIdx + PAGE_SIZE - 1;

        let dataQuery = supa
          .from('pontos')
          .select('id,user_id,created_at,latitude,longitude,precisao_m,origem,foto_url,validado')
          .gte('created_at', fromISO)
          .lte('created_at', toISO)
          .order('created_at', { ascending: false })
          .range(fromIdx, toIdx);

        if (qUserId.trim()) dataQuery = dataQuery.eq('user_id', qUserId.trim());

        const { data: list, error } = await dataQuery;
        if (error) throw error;

        setRows(list ?? []);
      } catch (e: any) {
        setErr(e?.message ?? 'Erro ao carregar registos');
      } finally {
        setLoading(false);
      }
    })();
  }, [authChecked, fromISO, toISO, qUserId, page]);

  async function toggleValidado(id: string, novoValor: boolean) {
    setErr(null);
    try {
      const { error } = await supa
        .from('pontos')
        .update({ validado: novoValor })
        .eq('id', id);
      if (error) throw error;

      setRows(prev =>
        prev.map(r => (r.id === id ? { ...r, validado: novoValor } : r))
      );
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao atualizar validação');
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function resetAndReload() {
    setPage(1);
    // o useEffect já recarrega quando filtros mudam
  }

  function linkMap(p: Ponto) {
    if (p.latitude == null || p.longitude == null) return null;
    const lat = p.latitude.toFixed(6);
    const lng = p.longitude.toFixed(6);
    return `https://maps.google.com/?q=${lat},${lng}`;
  }

  if (!authChecked) return null;
  if (loading && !rows.length) return <div style={{ padding: 24, fontFamily: 'system-ui' }}>A carregar…</div>;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24, fontFamily: 'system-ui' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Admin • Marcações de Ponto</h1>
        <nav style={{ display: 'flex', gap: 8 }}>
          <a href="/menu" style={{ textDecoration: 'none' }}>
            <button style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, background: '#fff' }}>
              ← Voltar ao Menu
            </button>
          </a>
        </nav>
      </header>

      {/* Filtros */}
      <section style={{ padding: 16, border: '1px solid #eee', borderRadius: 12, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#444' }}>De</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              style={{ padding: 8, border: '1px solid #ddd', borderRadius: 8 }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#444' }}>Até</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              style={{ padding: 8, border: '1px solid #ddd', borderRadius: 8 }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#444' }}>User ID (opcional)</span>
            <input
              placeholder="filtrar por user_id"
              value={qUserId}
              onChange={(e) => setQUserId(e.target.value)}
              style={{ padding: 8, border: '1px solid #ddd', borderRadius: 8 }}
            />
          </label>

          <div style={{ display: 'flex', alignItems: 'end', gap: 8 }}>
            <button
              onClick={resetAndReload}
              style={{ padding: '10px 14px', border: '1px solid #111', background: '#111', color: '#fff', borderRadius: 8 }}
            >
              Aplicar filtros
            </button>
            <button
              onClick={() => { setFrom(isoDate(today)); setTo(isoDate(today)); setQUserId(''); setPage(1); }}
              style={{ padding: '10px 14px', border: '1px solid #ddd', background: '#fff', borderRadius: 8 }}
            >
              Limpar
            </button>
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: 13, color: '#666' }}>
          Total: <b>{total}</b> registos • Página {page} de {totalPages}
        </div>
      </section>

      {/* Tabela */}
      <section style={{ border: '1px solid #eee', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr 1fr 1fr 1fr', gap: 0, background: '#fafafa', borderBottom: '1px solid #eee' }}>
          <Cell head>Foto</Cell>
          <Cell head>Data/Hora (UTC)</Cell>
          <Cell head>User ID</Cell>
          <Cell head>Localização</Cell>
          <Cell head>Origem</Cell>
          <Cell head>Ações</Cell>
        </div>

        {rows.map((p) => (
          <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr 1fr 1fr 1fr', borderBottom: '1px solid #eee' }}>
            <div style={{ padding: 10, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {p.foto_url ? (
                <a href={p.foto_url} target="_blank" rel="noreferrer">
                  {/* Imagem pequena para preview */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.foto_url} alt="foto" style={{ maxWidth: 90, maxHeight: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid #ddd' }} />
                </a>
              ) : (
                <span style={{ fontSize: 12, color: '#999' }}>sem foto</span>
              )}
            </div>

            <Cell>{new Date(p.created_at).toISOString().replace('T', ' ').slice(0, 19)}Z</Cell>
            <Cell mono>{p.user_id ?? '—'}</Cell>
            <Cell>
              {p.latitude != null && p.longitude != null ? (
                <>
                  <div>Lat/Lng: {p.latitude.toFixed(6)}, {p.longitude.toFixed(6)}</div>
                  {typeof p.precisao_m === 'number' && <div>± {p.precisao_m} m</div>}
                  <div>
                    <a href={linkMap(p) ?? '#'} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                      ver no mapa
                    </a>
                  </div>
                </>
              ) : (
                '—'
              )}
            </Cell>
            <Cell>{p.origem ?? '—'}</Cell>
            <Cell>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ fontSize: 12, color: p.validado ? '#14532d' : '#7f1d1d' }}>
                  {p.validado ? 'Validado' : 'Pendente'}
                </span>
                {p.validado ? (
                  <button
                    onClick={() => toggleValidado(p.id, false)}
                    style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 8, background: '#fff' }}
                  >
                    Desvalidar
                  </button>
                ) : (
                  <button
                    onClick={() => toggleValidado(p.id, true)}
                    style={{ padding: '6px 10px', border: '1px solid #111', borderRadius: 8, background: '#111', color: '#fff' }}
                  >
                    Validar
                  </button>
                )}
              </div>
            </Cell>
          </div>
        ))}

        {!rows.length && (
          <div style={{ padding: 16, textAlign: 'center', color: '#666' }}>
            Nenhum registo encontrado para o período/filtros.
          </div>
        )}
      </section>

      {/* paginação */}
      <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          style={{ padding: '8px 12px', border: '1px solid #ddd', background: '#fff', borderRadius: 8, opacity: page <= 1 ? 0.6 : 1 }}
        >
          ◀ Anterior
        </button>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          style={{ padding: '8px 12px', border: '1px solid #ddd', background: '#fff', borderRadius: 8, opacity: page >= totalPages ? 0.6 : 1 }}
        >
          Próxima ▶
        </button>
      </div>

      {err && (
        <div style={{ marginTop: 10, color: '#7f1d1d' }}>
          Erro: {err}
        </div>
      )}
    </div>
  );
}

function Cell(props: { children: any; head?: boolean; mono?: boolean }) {
  return (
    <div
      style={{
        padding: 10,
        borderRight: '1px solid #eee',
        background: props.head ? '#fafafa' : undefined,
        fontWeight: props.head ? 700 : 400,
        fontSize: props.head ? 13 : 14,
        fontFamily: props.mono ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' : 'inherit',
        wordBreak: 'break-word',
      }}
    >
      {props.children}
    </div>
  );
}
