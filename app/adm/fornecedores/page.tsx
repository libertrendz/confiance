'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import getBrowserSupabase from '@/lib/supa';

type Fornecedor = {
  id: string;
  denominacao: string;
  nif: string | null;
  email: string | null;
  telefone: string | null;
  cidade: string | null;
  created_at: string;
};

export default function FornecedoresPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [items, setItems] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data: u } = await supa.auth.getUser();
        if (!u.user) {
          window.location.replace('/login?next=' + encodeURIComponent('/adm/fornecedores'));
          return;
        }

        let query = supa
          .from('fornecedores')
          .select('id,denominacao,nif,email,telefone,cidade,created_at')
          .order('created_at', { ascending: false })
          .limit(200);

        if (q.trim()) {
          // pesquisa simples por ILIKE (colunas principais)
          query = query.or(
            `denominacao.ilike.%${q.trim()}%,nif.ilike.%${q.trim()}%,email.ilike.%${q.trim()}%,telefone.ilike.%${q.trim()}%`
          );
        }

        const { data, error } = await query;
        if (error) throw error;
        setItems(data ?? []);
      } catch (e: any) {
        setErr(e?.message ?? 'Erro a carregar fornecedores');
      } finally {
        setLoading(false);
      }
    })();
  }, [supa, q]);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 24, fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Fornecedores</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/adm/fornecedores/importar">
            <button style={{ padding: '8px 12px', border: '1px solid #111', background: '#111', color: '#fff', borderRadius: 8 }}>
              Importar CSV
            </button>
          </Link>
          <Link href="/menu">
            <button style={{ padding: '8px 12px', border: '1px solid #ddd', background: '#fff', borderRadius: 8 }}>
              Menu
            </button>
          </Link>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Pesquisar por nome, NIF, email, telefone…"
          style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
        />
      </div>

      {loading && <p style={{ marginTop: 12 }}>A carregar…</p>}
      {err && <p style={{ marginTop: 12, color: '#7f1d1d' }}>{err}</p>}

      <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
        {items.map((f) => (
          <div key={f.id} style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700 }}>{f.denominacao}</div>
                <div style={{ fontSize: 12, color: '#444' }}>
                  NIF: {f.nif ?? '—'} · {f.email ?? '—'} · {f.telefone ?? '—'} · {f.cidade ?? '—'}
                </div>
              </div>
            </div>
          </div>
        ))}
        {!loading && !err && items.length === 0 && <p>Nenhum fornecedor encontrado.</p>}
      </div>
    </div>
  );
}
