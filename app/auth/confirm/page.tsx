// app/auth/confirm/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import getBrowserSupabase from '../../../lib/supa';

export const dynamic = 'force-dynamic';

export default function AuthConfirmPage() {
  const router = useRouter();
  const [msg, setMsg] = useState('A confirmar login…');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const supa = getBrowserSupabase();
      const sp = new URLSearchParams(window.location.search);

      // novo formato (correto) para magic link
      const token_hash = sp.get('token_hash');
      const type = sp.get('type');
      const next = sp.get('next') || '/menu';

      try {
        if (type === 'magiclink' && token_hash) {
          const { error } = await supa.auth.verifyOtp({
            type: 'magiclink',
            token_hash,
          });

          if (error) throw error;

          if (!cancelled) {
            setMsg('Login confirmado! Redirecionando…');
            router.replace(next);
          }
          return;
        }

        // Se chegou aqui sem token válido
        throw new Error('Link inválido ou expirado');
      } catch (e: any) {
        console.error('Auth confirm error:', e?.message || e);
        if (!cancelled) {
          setMsg('Não foi possível confirmar o login. Redirecionando para o login…');
          setTimeout(() => router.replace('/login'), 800);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Autenticação</h1>
      <p>{msg}</p>
    </div>
  );
}
