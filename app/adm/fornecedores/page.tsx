'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import getBrowserSupabase from '@/lib/supa';
import { useRouter } from 'next/navigation';

type Fornecedor = {
  id: string;
  denominacao: string | null;
  nif: string | null;
  email: string | null;
  telefone: string | null;
  morada: string | null;
  cidade: string | null;
  pais: string | null;
  created_at: string;
};

export default function FornecedoresListaPage() {
  const router = useRouter();
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [emailUser, setEmailUser] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<Fornecedor[]>([]);

  useEffect(() => {
    (async () => {
      try {
        // Autenticação
        const { data } = await supa.auth.getUser();
        if (!data.user) {
          router.replace('/login?next=' + encodeURIComponent('/adm/fornecedores'));
          return;
        }
        setEmailUser(data.user.email ?? null);

        await carregar();
      } catch (e: any) {
        setErr(e?.message ?? 'Erro');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregar() {
    setErr(null);
    setLoading(true);
    try {
      let query = supa
        .from('fornecedores')
        .select('id,denominacao,nif,email,telefone,morada,cidade,pais,created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (q.trim()) {
        const t = `%${q.trim()}%`;
        query = query.or(
          [
            `denominacao.ilike.${t}`,
            `nif.ilike.${t}`,
            `email.ilike.${t}`,
            `telefone.ilike.${t}`,
            `cidade.ilike.${t}`,
            `pais.ilike.${t}`
          ].join(',')
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      setRows(data ?? []);
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao carregar fornecedores');
    } finally {
      setLoading(false);
    }
  }

  async function sair() {
    await supa.auth.signOut();
    router.replace('/login');
  }

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: 24, fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Fornecedores</h1>
        <div>
          <span style={{ marginRight: 12, fontSize: 13, color: '#555' }}>{emailUser}</span>
          <button onClick={sair} style={{ padding: '8px 12px', border: '1px solid #111', background: '#111', color: '#fff', borderRadius: 8 }}>
            Sair
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input
          placeholder="Pesquisar por nome, NIF, email, telefone, cidade, país…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: 1, padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
        />
        <button onClick={carregar} style={{ padding: '10px 14px', border: '1px solid #111', background: '#111', color: '#fff', borderRadius: 8 }}>
          Buscar
        </button>
        <Link href="/adm/fornecedores/novo">
          <button style={{ padding: '10px 14px', border: '1px solid #0a0', background: '#0a0', color: '#fff', borderRadius: 8 }}>
            + Novo
          </button>
        </Link>
      </div>

      {loading && <p style={{ marginTop: 12 }}>A carregar…</p>}
      {err && <p style={{ marginTop: 12, color: '#7f1d1d' }}>Erro: {err}</p>}

      <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
        {rows.map((r) => (
          <div key={r.id} style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 700 }}>{r.denominacao || '—'}</div>
                <div style={{ fontSize: 13, color: '#555' }}>
                  NIF: {r.nif || '—'} &nbsp;•&nbsp; {r.email || '—'} &nbsp;•&nbsp; {r.telefone || '—'}
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#666' }}>
                {r.cidade || '—'} {r.pais ? `• ${r.pais}` : ''}
              </div>
            </div>
            {r.morada && <div style={{ marginTop: 6, fontSize: 13 }}>{r.morada}</div>}
          </div>
        ))}
        {!loading && !err && rows.length === 0 && <p>Nenhum fornecedor encontrado.</p>}
      </div>
    </div>
  );
}
