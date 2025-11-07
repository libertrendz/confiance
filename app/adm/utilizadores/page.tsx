// app/adm/utilizadores/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  email: string;
  nome: string;
  papel: 'admin' | 'gestor' | 'externo';
  created_at: string | null;
  updated_at: string | null;
};

export default function UtilizadoresListPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [rows, setRows] = useState<Row[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // 1) Garante sessão
        const { data: s } = await supa.auth.getSession();
        if (!s.session) {
          window.location.replace('/login');
          return;
        }
        setMeId(s.session.user.id);

        // 2) Carrega a lista (RLS filtra por empresa)
        const { data, error } = await supa
          .from('v_admin_users')
          .select('id, email, nome, papel, created_at, updated_at')
          .order('created_at', { ascending: true });

        if (error) throw error;
        if (!alive) return;

        setRows(data as Row[]);
      } catch (e: any) {
        setErr(e?.message ?? 'Falha ao carregar utilizadores.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [supa]);

  return (
    <main style={{ padding: 18, fontFamily: 'system-ui', maxWidth: 1100 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#0A3D91' }}>Utilizadores</h1>
        <a
          href="/adm/utilizadores/convite"
          style={{
            textDecoration: 'none', padding: '10px 14px', borderRadius: 10,
            border: 'none', background: '#0A3D91', color: '#fff'
          }}
        >
          Convidar novo utilizador
        </a>
      </header>

      {loading && <p style={{ color: '#666' }}>A carregar…</p>}
      {err && <p style={{ color: 'crimson' }}>{err}</p>}

      {!loading && !err && (
        <>
          {rows.length === 0 ? (
            <div style={{
              border: '1px dashed #D7E3FF', borderRadius: 12, padding: 16, background: '#F7FAFF'
            }}>
              <p style={{ margin: 0, color: '#49546A' }}>
                Nenhum utilizador encontrado na tua empresa. Começa por <a href="/adm/utilizadores/convite">convidar</a>.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid #E9EEF7', borderRadius: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead style={{ background: '#F5F8FF' }}>
                  <tr>
                    <th style={th}>Nome</th>
                    <th style={th}>Email</th>
                    <th style={th}>Papel</th>
                    <th style={th}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} style={{ borderTop: '1px solid #EEF3FF' }}>
                      <td style={td}>{r.nome || '—'}</td>
                      <td style={td}>{r.email}</td>
                      <td style={td}>
                        <span style={{
                          fontSize: 12, background: '#EEF3FF', color: '#0A3D91',
                          padding: '4px 8px', borderRadius: 999, border: '1px solid #D7E3FF'
                        }}>
                          {r.papel.toUpperCase()}
                        </span>
                      </td>
                      <td style={td}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <a
                            href={`/adm/utilizadores/editar?id=${r.id}`}
                            style={ghostBtn}
                          >
                            Editar
                          </a>
                          {/* Remover/Desativar poderá vir depois, com confirmação */}
                          {meId !== r.id && (
                            <button
                              disabled
                              title="Em breve"
                              style={{ ...ghostBtn, opacity: 0.6, cursor: 'not-allowed' }}
                            >
                              Remover
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </main>
  );
}

const th: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', color: '#0A3D91' };
const td: React.CSSProperties = { padding: '10px 12px', color: '#323B4B' };
const ghostBtn: React.CSSProperties = {
  textDecoration: 'none', padding: '8px 12px', borderRadius: 10,
  border: '1px solid #D7E3FF', background: '#fff', color: '#0A3D91'
};
