// app/auth/signout/page.tsx
'use client';

import { useEffect, useMemo } from 'react';
import getBrowserSupabase from '@/lib/supa';

export default function SignOutPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);

  useEffect(() => {
    (async () => {
      try {
        await supa.auth.signOut(); // limpa sessão (localStorage + listeners)
      } catch {
        // ignoramos erros
      } finally {
        window.location.replace('/login'); // redireciona sempre
      }
    })();
  }, [supa]);

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 18, fontWeight: 700 }}>A terminar sessão…</h1>
    </main>
  );
}
