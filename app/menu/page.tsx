// app/menu/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

export const dynamic = 'force-dynamic';

export default function MenuPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supa.auth.getSession();
        if (!data.session) {
          window.location.replace('/login');
          return;
        }
        if (mounted) setEmail(data.session.user.email ?? null);
      } catch (e: any) {
        if (mounted) setErr(e?.message || 'Erro ao carregar menu');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [supa]);

  if (loading) return <div style={{ padding: 24 }}>Carregando…</div>;
  if (err) return <div style={{ padding: 24, color: '#7f1d1d' }}>Erro: {err}</div>;

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: 24, fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Menu</h1>
        <div>
          <span style={{ marginRight: 12 }}>{email}</span>
          <button
            onClick={async () => { await supa.auth.signOut(); window.location.replace('/login'); }}
            style={{ padding: '8px 12px', border: '1px solid #111', background: '#111', color: '#fff', borderRadius: 8 }}
          >
            Sair
          </button>
        </div>
      </div>

      <div style={{ marginTop: 16, padding: 16, border: '1px solid #eee', borderRadius: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Bem-vindo 👋</h2>
        <p>Se você está vendo esta página, a sessão foi reconhecida corretamente.</p>
      </div>
    </div>
  );
}
