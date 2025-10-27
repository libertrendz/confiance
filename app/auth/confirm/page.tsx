// app/auth/confirm/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import getBrowserSupabase from '@/lib/supa';

export default function AuthConfirmPage() {
  const router = useRouter();
  const search = useSearchParams();
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [status, setStatus] = useState('A confirmar login…');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = search.get('next') || '/menu';
        const code = search.get('code') || search.get('token_hash');

        if (!code) {
          setStatus('Link inválido. Redirecionando ao login…');
          setTimeout(() => router.replace('/login'), 800);
          return;
        }

        const { error } = await supa.auth.exchangeCodeForSession(code);
        if (error) throw error;

        if (!cancelled) {
          setStatus('Login confirmado! Redirecionando…');
          router.replace(next);
        }
      } catch (e: any) {
        console.error('confirm error:', e?.message || e);
        if (!cancelled) {
          setStatus('Não foi possível confirmar o login. Redirecionando…');
          setTimeout(() => router.replace('/login'), 1000);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [supa, router, search]);

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      {status}
    </div>
  );
}
