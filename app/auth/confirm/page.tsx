// app/auth/confirm/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import getBrowserSupabase from '../../../lib/supa';

export default function AuthConfirmPage() {
  const router = useRouter();
  const qp = useSearchParams();
  const next = qp.get('next') || '/menu';

  const supa = useMemo(() => getBrowserSupabase(), []);
  const [status, setStatus] = useState('Confirmando login…');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Fluxos possíveis:
        // 1) Magic Link (token_hash + type=magiclink)
        const tokenHash = qp.get('token_hash');
        const type = qp.get('type');

        if (tokenHash && type === 'magiclink') {
          const { error } = await supa.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'magiclink',
          });
          if (error) throw error;
          if (!cancelled) {
            setStatus('Login confirmado! Redirecionando…');
            router.replace(next);
            return;
          }
        }

        // 2) PKCE OAuth (code=?)
        const code = qp.get('code');
        if (code) {
          const { error } = await supa.auth.exchangeCodeForSession(code);
          if (error) throw error;
          if (!cancelled) {
            setStatus('Login confirmado! Redirecionando…');
            router.replace(next);
            return;
          }
        }

        // 3) Hash com access_token (fallback)
        const hasHash =
          typeof window !== 'undefined' && window.location.hash.includes('access_token');
        if (hasHash) {
          // v2 não usa mais getSessionFromUrl, então removemos isso.
          // Apenas redireciona — o cliente já terá cookie/sessão gravado pelo verifyOtp/exchange acima.
          if (!cancelled) {
            setStatus('Sessão encontrada. Redirecionando…');
            router.replace(next);
            return;
          }
        }

        // Se nada serviu, volta ao login
        if (!cancelled) {
          setStatus('Não foi possível confirmar o login. Redirecionando…');
          setTimeout(() => router.replace('/login'), 800);
        }
      } catch (e: any) {
        console.error('Auth confirm error:', e);
        if (!cancelled) {
          setStatus('Não foi possível confirmar o login. Redirecionando…');
          setTimeout(() => router.replace('/login'), 800);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [qp, router, supa, next]);

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Autenticação</h1>
      <p>{status}</p>
    </div>
  );
}
