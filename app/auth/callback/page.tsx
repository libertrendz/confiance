'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

export default function CallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('A confirmar login…');

  useEffect(() => {
    // Tudo roda só no client
    const supa = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: true, autoRefreshToken: true } }
    );

    (async () => {
      try {
        const url = new URL(window.location.href);
        const next = url.searchParams.get('next') || '/menu';

        // 1) Fluxo PKCE / OAuth: ?code=...
        const code = url.searchParams.get('code');
        if (code) {
          const { error } = await supa.auth.exchangeCodeForSession(code);
          if (error) throw error;
          setStatus('Login confirmado! Redirecionando…');
          router.replace(next);
          return;
        }

        // 2) Fluxo Magic Link: #access_token=...&refresh_token=...
        const hash = window.location.hash;
        if (hash.includes('access_token')) {
          const params = new URLSearchParams(hash.replace(/^#/, ''));
          const access_token = params.get('access_token') || '';
          const refresh_token = params.get('refresh_token') || '';

          if (access_token && refresh_token) {
            const { error } = await supa.auth.setSession({ access_token, refresh_token });
            if (error) throw error;
            setStatus('Login confirmado! Redirecionando…');
            router.replace(next);
            return;
          }
        }

        // Se não tinha code nem tokens no hash, volta pro login
        setStatus('Não foi possível confirmar o login. Redirecionando…');
        setTimeout(() => router.replace('/login'), 700);
      } catch {
        setStatus('Não foi possível confirmar o login. Redirecionando…');
        setTimeout(() => router.replace('/login'), 700);
      }
    })();
  }, [router]);

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 18, fontWeight: 700 }}>{status}</h1>
      <p style={{ marginTop: 6, color: '#555' }}>
        Se nada acontecer em alguns segundos, <a href="/login">volte ao login</a>.
      </p>
    </div>
  );
}
