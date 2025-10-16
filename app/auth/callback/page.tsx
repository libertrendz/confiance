// app/auth/callback/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getBrowserSupabase } from '../../../lib/supa';

export default function CallbackPage() {
  const router = useRouter();
  const params = useSearchParams();
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [status, setStatus] = useState('A confirmar login…');

  const next = params.get('next') || '/menu';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const code = params.get('code');
        const hash = typeof window !== 'undefined' ? window.location.hash : '';

        if (code) {
          const { error } = await supa.auth.exchangeCodeForSession(code);
          if (error) throw error;
          if (!cancelled) {
            setStatus('Login confirmado! Redirecionando…');
            router.replace(next);
          }
          return;
        }

        if (hash.includes('access_token')) {
          const { data } = await supa.auth.getUser();
          if (data.user && !cancelled) {
            router.replace(next);
            return;
          }
        }

        if (!cancelled) router.replace('/login');
      } catch (e: any) {
        console.error('Callback error:', e?.message || e);
        if (!cancelled) {
          setStatus('Não foi possível confirmar o login. Voltando ao login…');
          setTimeout(() => router.replace('/login'), 800);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supa, router, params, next]);

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <p>{status}</p>
    </div>
  );
}
