// app/menu/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import getBrowserSupabase from '@/lib/supa';

export default function MenuPage() {
  const router = useRouter();
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supa.auth.getUser();
        if (!data.user) {
          router.replace('/login');
          return;
        }
        setEmail(data.user.email ?? null);
      } finally {
        setChecking(false);
      }
    })();
  }, [supa, router]);

  async function sair() {
    await supa.auth.signOut();
    router.replace('/login');
  }

  if (checking) {
    return <div style={{ padding: 24, fontFamily: 'system-ui' }}>A carregar…</div>;
  }

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: 24, fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Menu</h1>
        <div>
          <span style={{ marginRight: 12 }}>{email}</span>
          <button
            onClick={sair}
            style={{ padding: '8px 12px', border: '1px solid #111', background: '#111', color: '#fff', borderRadius: 8 }}
          >
            Sair
          </button>
        </div>
      </div>

      <div style={{ marginTop: 16, padding: 16, border: '1px solid #eee', borderRadius: 12 }}>
        <p>🚀 Logado com sucesso. Em breve: cards do projeto, fases e despesas.</p>
      </div>
    </div>
  );
}
