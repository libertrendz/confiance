// app/adm/utilizadores/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

type Row = { id: string; email: string; nome: string | null; papel: 'admin'|'gestor'|'externo' };

export default function UtilizadoresListPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string|null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setErr(null);
      try {
        const { data: { session } } = await supa.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error('Sem sessão');

        const res = await fetch('/api/admin/users/list', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.details || json?.error || 'Falha na listagem');
        if (!alive) return;
        setRows(json.rows as Row[]);
      } catch (e:any) {
        setErr(e?.message || 'Erro inesperado');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [supa]);

  async function excluir(id: string) {
    if (!confirm('Excluir este utilizador? Esta ação é irreversível.')) return;
    try {
      const { data: { session } } = await supa.auth.getSession();
      const token = session?.access_token!;
      const res = await fetch('/api/admin/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_id: id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.details || json?.error);
      setRows(r => r.filter(x => x.id !== id));
    } catch (e:any) {
      alert(e?.message || 'Erro ao excluir');
    }
  }

  return (
    <main style={{ padding: 16, fontFamily: 'system-ui', maxWidth: 1000, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Utilizadores</h1>

      <div style={{ marginBottom: 12 }}>
        <a href="/adm/utilizadores/novo" style={{ textDecoration: 'none', padding: '10px 14px', borderRadius: 10, background: '#0A3D91', color:'#fff' }}>
          Novo utilizador
        </a>
      </div>

      {loading && <p>A carregar…</p>}
      {err && <p style={{ color: 'crimson' }}>{err}</p>}

      {!loading && !err && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F4F7FF', textAlign: 'left' }}>
                <th style={{ padding: 10 }}>Nome</th>
                <th style={{ padding: 10 }}>Email</th>
                <th style={{ padding: 10 }}>Papel</th>
                <th style={{ padding: 10, width: 180 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={{ padding: 10 }}>{r.nome || '—'}</td>
                  <td style={{ padding: 10 }}>{r.email}</td>
                  <td style={{ padding: 10, textTransform: 'uppercase' }}>{r.papel}</td>
                  <td style={{ padding: 10, display: 'flex', gap: 8 }}>
                    <a href={`/adm/utilizadores/${r.id}/edit`} style={{ textDecoration: 'none', padding: '6px 10px', border: '1px solid #D7E3FF', borderRadius: 8 }}>
                      Editar
                    </a>
                    <button onClick={() => excluir(r.id)} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan={4} style={{ padding: 16, color: '#666' }}>Nenhum utilizador encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
