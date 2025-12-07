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
        .from('ponto_registro')
        .select('*')
        .order('batida_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setRows((data as PontoRow[]) || []);
    } catch (e: any) {
      console.error('Erro ao carregar ponto_registro', e);
      setErr(e?.message || 'Falha ao carregar registos de ponto.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
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
        {err && (
          <p style={{ color: 'crimson', marginBottom: 8 }}>
            {err}
          </p>
        )}

        {!rows?.length && !loading && !err && (
          <p className="muted">Sem registos de ponto.</p>
        )}

        {!!rows?.length && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: 8 }}>Data / Hora</th>
                  <th style={{ padding: 8 }}>Tipo</th>
                  <th style={{ padding: 8 }}>Utilizador (ID)</th>
                  <th style={{ padding: 8 }}>Empresa (ID)</th>
                  <th style={{ padding: 8 }}>Resumo (meta)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const s = summarizeMeta(r.meta);
                  return (
                    <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: 8 }}>
                        {r.batida_at
                          ? new Date(r.batida_at).toLocaleString()
                          : '—'}
                      </td>
                      <td style={{ padding: 8 }}>{r.tipo || '—'}</td>
                      <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 12 }}>
                        {r.usuario_id}
                      </td>
                      <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 12 }}>
                        {r.empresa_id}
                      </td>
                      <td style={{ padding: 8, fontSize: 12 }}>
                        <div style={{ lineHeight: 1.4 }}>
                          <div>
                            Foto no local:{' '}
                            {s.foto === null ? '—' : s.foto ? 'Sim' : 'Não'}
                          </div>
                          <div>
                            Geo registado:{' '}
                            {s.geo === null ? '—' : s.geo ? '