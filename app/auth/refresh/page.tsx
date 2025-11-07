'use client';

import { useEffect } from 'react';
import getBrowserSupabase from '@/lib/supa';

export default function RefreshClaimsPage() {
  useEffect(() => {
    (async () => {
      try {
        const supa = getBrowserSupabase();
        const { data, error } = await supa.auth.refreshSession();
        // Se deu certo, vai ler os claims novos (app_role etc.)
        if (!error && data?.session) {
          window.location.replace('/menu');
          return;
        }
      } catch {}
      // fallback: se falhar refresh, volta ao login
      window.location.replace('/login');
    })();
  }, []);
  return (
    <main style={{ padding: 24, fontFamily: 'system-ui' }}>
      <p>A atualizar sessão…</p>
    </main>
  );
}
