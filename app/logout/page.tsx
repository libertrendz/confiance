'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

export default function LogoutPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [status, setStatus] = useState('Terminando sessão…');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // 1) limpa storage do browser (localStorage/IndexedDB)
        await supa.auth.signOut();

        // 2) garante cookies http-only limpar no servidor
        //    (o /auth/signout já redireciona para /login)
        window.location.replace('/auth/signout');
      } catch {
        if (!alive) return;
        setStatus('Falha ao terminar sessão. Redirecionando…');
        window.location.replace('/auth/signout');
      }
    })();
    return () => {
      alive = false;
    };
  }, [supa]);

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 18, fontWeight: 700 }}>{status}</h1>
    </main>
  );
}
