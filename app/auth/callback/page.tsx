// app/auth/callback/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supa } from '@/lib/supa';

export default function AuthCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState('Confirmando login…');

  // para onde ir depois (se veio ?next=...)
  const next = params.get('next') || '/menu';

  useEffect(() => {
    (async () => {
      try {
        // v2: troca o código do magic link por sessão e salva cookies/localStorage
        const { error } = await supa.auth.exchangeCodeForSession(
          window.location.href
        );

        if (error) {
          console.error('exchangeCodeForSession error:', error);
          setStatus('Não foi possível confirmar o login. Redirecionando…');
          setTimeout(() => router.replace('/login'), 900);
          return;
        }

        setStatus('Login confirmado! Abrindo o menu…');
        setTimeout(() => router.replace(next), 600);
      } catch (e) {
        console.error(e);
        setStatus('Erro inesperado. Redirecionando…');
        setTimeout(() => router.replace('/login'), 900);
      }
    })();
  }, [router, next]);

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 18, fontWeight: 700 }}>Autenticação</h1>
      <p style={{ marginTop: 8 }}>{status}</p>
    </div>
  );
}
