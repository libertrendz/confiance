// app/auth/callback/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabase } from '@/lib/supa'; // mesmo helper que você já usa no Menu

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Confirmando login…');

  useEffect(() => {
    (async () => {
      try {
        const supa = getBrowserSupabase();

        // 1) next (se veio na URL como ?next=/algo)
        const search = typeof window !== 'undefined' ? window.location.search : '';
        const nextParam = new URLSearchParams(search).get('next');
        const next = nextParam && nextParam.startsWith('/') ? nextParam : '/menu';

        // 2) Tentativa A: fluxo com hash (access_token/refresh_token)
        const hash = typeof window !== 'undefined' ? window.location.hash : '';
        if (hash && hash.includes('access_token')) {
          const h = new URLSearchParams(hash.replace(/^#/, ''));
          const access_token = h.get('access_token');
          const refresh_token = h.get('refresh_token');

          if (access_token && refresh_token) {
            const { error } = await supa.auth.setSession({ access_token, refresh_token });
            if (!error) {
              setStatus('Login confirmado! Redirecionando…');
              router.replace(next);
              return;
            }
          }
        }

        // 3) Tentativa B (fallback): fluxo PKCE (?code=...) — se algum provedor enviar assim
        const code = new URLSearchParams(search).get('code');
        if (code) {
          // o exchangeCodeForSession do supabase-js v2 recebe o code via objeto
          const { error } = await supa.auth.exchangeCodeForSession({ code });
          if (!error) {
            setStatus('Login confirmado! Redirecionando…');
            router.replace(next);
            return;
          }
        }

        // 4) Se chegou aqui, não conseguimos confirmar
        setStatus('Não foi possível confirmar o login. Voltando ao início…');
        router.replace('/login');
      } catch (e) {
        console.error('Callback error:', e);
        setStatus('Ocorreu um erro ao confirmar o login. Voltando ao início…');
        router.replace('/login');
      }
    })();
  }, [router]);

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Autenticando…</h1>
      <p>{status}</p>
    </div>
  );
}
