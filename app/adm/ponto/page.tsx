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
        .from<PontoRow>('ponto_registro')
        .select('*')
        .order('batida_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setRows(data || []);
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
                    <td style={{ padding: 8 }}>{r.tipo || '—'}</td>
                    <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 12 }}>
                      {r.usuario_id}
                    </td>
                    <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 12 }}>
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
