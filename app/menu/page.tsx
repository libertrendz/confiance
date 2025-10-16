// app/menu/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabase } from '../../lib/supa';

export default function MenuPage() {
  const router = useRouter();
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supa.auth.getUser();
        if (!data.user) {
          router.replace('/login?next=/menu');
          return;
        }
        setEmail(data.user.email ?? null);
      } catch (e: any) {
        setErr(e?.message ?? 'Erro ao verificar sessão');
      } finally {
        setLoading(false);
      }
    })();
  }, [supa, router]);

  async function sair() {
    await supa.auth.signOut();
    router.replace('/login');
  }

  if (loading) return <div style={{ padding: 24 }}>A carregar…</div>;
  if (err) return <div style={{ padding: 24, color: '#7f1d1d' }}>Erro: {err}</div>;

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Menu</h1>
        <div>
          <span style={{ marginRight: 12 }}>{email}</span>
          <button onClick={sair} style={{ padding: '8px 12px', border: '1px solid #111', background: '#111', color: '#fff', borderRadius: 8 }}>
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
