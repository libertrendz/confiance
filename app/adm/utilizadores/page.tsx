// app/adm/utilizadores/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

export const dynamic = 'force-dynamic';

type Papel = 'admin' | 'gestor' | 'externo';

type Row = {
  id: string;
  email: string | null;
  nome: string | null;
  papel: Papel;
  last_sign_in_at: string | null;
  empresa_id: string;
};

export default function UtilizadoresPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        // Garante que há sessão
        const { data: s } = await supa.auth.getSession();
        if (!s.session) {
          window.location.replace('/login');
          return;
        }

        // Chama a RPC segura (SECURITY DEFINER)
        const { data, error } = await supa.rpc('admin_users_list');
        if (error) throw error;
        if (!alive) return;

        setRows((data || []) as Row[]);
      } catch (e: any) {
        setErr(e?.message ?? 'Falha ao carregar utilizadores.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [supa]);

  return (
    <main style={{ padding: 18, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#0A3D91' }}>
        Utilizadores
      </h1>
      <p style={{ marginTop: 0, color: '#49546A' }}>
        Gestão de utilizadores por empresa (apenas administradores).
      </p>

      {/* Ações topo */}
      <div style={{ display: 'flex', gap: 8, margin: '12px 0 16px 0', flexWrap: 'wrap' }}>
        <a
          href="/adm/utilizadores/convite"
          style={{
            textDecoration: 'none',
            padding: '8px 12px',
            borderRadius: 10,
            background: '#0A3D91',
            color: '#fff',
            fontSize: 14,
          }}
        >
          Convidar novo utilizador
        </a>
      </div>

      {/* Estados */}
      {loading && <p style={{ color: '#666' }}>A carregar…</p>}
      {err && (
        <div style={{ color: 'crimson', border: '1px solid #f2bcbc', padding: 10, borderRadius: 8 }}>
          {err}
        </div>
      )}

      {!loading && !err && rows.length === 0 && (
        <p style={{ color: '#666' }}>Sem utilizadores para esta empresa.</p>
      )}

      {/* Tabela */}
      {!loading && !err && rows.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: 720,
              background: '#fff',
              border: '1px solid #E9EEF7',
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            <thead style={{ background: '#F7FAFF' }}>
              <tr>
                <Th>Nome</Th>
                <Th>Email</Th>
                <Th>Papel</Th>
                <Th>Último acesso</Th>
                <Th>Ações</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderTop: '1px solid #EEF3FF' }}>
                  <Td style={{ fontWeight: 600 }}>{r.nome || '—'}</Td>
                  <Td>{r.email || '—'}</Td>
                  <Td>
                    <span
                      style={{
                        fontSize: 12,
                        background: '#EEF3FF',
                        color: '#0A3D91',
                        padding: '4px 8px',
                        borderRadius: 999,
                        border: '1px solid #D7E3FF',
                      }}
                    >
                      {r.papel.toUpperCase()}
                    </span>
                  </Td>
                  <Td>{r.last_sign_in_at ? new Date(r.last_sign_in_at).toLocaleString() : '—'}</Td>
                  <Td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <a
                        href={`/adm/utilizadores/editar?id=${r.id}`}
                        style={{
                          textDecoration: 'none',
                          padding: '6px 10px',
                          borderRadius: 8,
                          border: '1px solid #D7E3FF',
                          color: '#0A3D91',
                          fontSize: 13,
                          background: '#fff',
                        }}
                      >
                        Editar
                      </a>
                      <a
                        href={`/adm/utilizadores/detalhe?id=${r.id}`}
                        style={{
                          textDecoration: 'none',
                          padding: '6px 10px',
                          borderRadius: 8,
                          border: '1px solid #E9EEF7',
                          color: '#49546A',
                          fontSize: 13,
                          background: '#fff',
                        }}
                      >
                        Detalhe
                      </a>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: 'left',
        padding: '10px 12px',
        fontSize: 12,
        color: '#49546A',
        fontWeight: 700,
        borderBottom: '1px solid #E9EEF7',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, style = {} as React.CSSProperties }) {
  return (
    <td
      style={{
        padding: '10px 12px',
        fontSize: 13,
        color: '#2E374D',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </td>
  );
}
