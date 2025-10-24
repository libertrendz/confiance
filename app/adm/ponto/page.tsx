// app/adm/ponto/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import getBrowserSupabase from '@/lib/supa';

type Ponto = {
  id: string;
  created_at: string | null;
  usuario_id: string | null;
  tipo: 'IN' | 'OUT' | null;
  status: 'ok' | 'pendente' | 'rejeitado' | null;
};

export default function PontoPage() {
  const router = useRouter();
  const supa = useMemo(() => getBrowserSupabase(), []);

  const [email, setEmail] = useState<string | null>(null);
  const [list, setList] = useState<Ponto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supa.auth.getUser();
      if (!data.user) {
        router.replace('/login?next=/adm/ponto');
        return;
      }
      setEmail(data.user.email ?? null);

      // só para compilar/mostrar algo
      setList([]);
      setLoading(false);
    })();
  }, [router, supa]);

  if (loading) return <div style={{ padding: 24 }}>A carregar…</div>;

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700 }}>Ponto</h1>
      <p style={{ marginTop: 8 }}>Utilizador: {email}</p>

      <div style={{ marginTop: 16, borderTop: '1px solid #eee', paddingTop: 12 }}>
        <p>Histórico (placeholder):</p>
        {list.length === 0 ? (
          <p style={{ color: '#6b7280' }}>Sem marcações ainda.</p>
        ) : (
          <ul>
            {list.map((p) => (
              <li key={p.id}>
                {p.created_at} — {p.tipo} — {p.status}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
