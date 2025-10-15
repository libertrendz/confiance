// app/auth/callback/page.tsx
'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getBrowserSupabase } from '../../../lib/supa';

function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Confirmando login…');

  const next = searchParams.get('next') || '/menu';

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const supa = getBrowserSupabase();

        // Fluxo oficial (OTP/Magic Link via PKCE): vem ?code=...
        const code = searchParams.get('code');
        if (code) {
          const { error } = await supa.auth.exchangeCodeForSession(code);
          if (error) throw error;
          if (!cancelled) {
            setStatus('Login confirmado! Redirecionando…');
            router.replace(next);
          }
          return;
        }

        // Se não veio code, volta ao login
        setStatus('Não foi possível confirmar o login. Voltando ao início…');
        router.replace(`/login?next=${encodeURIComponent(next)}`);
      } catch (err) {
        console.error('Auth callback error:', err);
        setStatus('Não foi possível confirmar o login. Voltando ao início…');
        router.replace(`/login?next=${encodeURIComponent(next)}`);
      }
    })();

    return () => { cancelled = true; };
  }, [router, searchParams, next]);

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 520, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Autenticando…</h1>
      <p>{status}</p>
      <p style={{ marginTop: 8 }}>
        Se não avançar automaticamente, <a href={`/login?next=${encodeURIComponent(next)}`}>clique aqui</a>.
      </p>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Carregando…</div>}>
      <CallbackInner />
    </Suspense>
  );
}
