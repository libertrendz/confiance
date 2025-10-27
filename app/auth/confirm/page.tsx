// app/auth/confirm/page.tsx
'use client';

import { useEffect, useState } from 'react';
import getBrowserSupabase from '../../../lib/supa';

export const dynamic = 'force-dynamic';

export default function AuthConfirmPage() {
  const [msg, setMsg] = useState('A confirmar login…');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const supa = getBrowserSupabase();
      const sp = new URLSearchParams(window.location.search);
      const token_hash = sp.get('token_hash');
      const type = sp.get('type');

      try {
        if (type === 'magiclink' && token_hash) {
          const { error } = await supa.auth.verifyOtp({
            type: 'magiclink',
            token_hash,
          });
          if (error) throw error;

          if (!cancelled) {
            setMsg('Login confirmado! Redirecionando…');
            // usa redirecionamento forte para evitar ficar na mesma página
            window.location.replace('/menu');
          }
          return;
        }

        throw new Error('Link inválido ou expirado');
      } catch (e: any) {
        console.error('Auth confirm error:', e?.message || e);
        if (!cancelled) {
          setMsg('Não foi possível confirmar o login. Redirecionando para o login…');
          setTimeout(() => window.location.replace('/login'), 800);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Autenticação</h1>
      <p>{msg}</p>
    </div>
  );
}
