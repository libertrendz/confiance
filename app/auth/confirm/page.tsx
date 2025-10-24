'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getBrowserSupabase } from '../../../lib/supa';

export default function AuthConfirmPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState('Confirmando login…');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const supa = getBrowserSupabase();

        // Lê os parâmetros da URL (gerados pelo Supabase)
        const token_hash = params.get('token_hash');
        const type = (params.get('type') || 'magiclink').toLowerCase();
        const code = params.get('code'); // fluxo OAuth/PKCE
        const next = params.get('next') || '/menu';

        // 1) Se veio PKCE/OAuth, troca "code" por sessão
        if (code) {
          const { error } = await supa.auth.exchangeCodeForSession(code);
          if (error) throw error;
          if (!cancelled) {
            setStatus('Login confirmado! Redirecionando…');
            router.replace(next);
          }
          return;
        }

        // 2) Se veio magic link (token_hash), confirma
        if (token_hash) {
          // Tipos válidos: magiclink | signup | invite | recovery | email_change
          const validTypes = ['magiclink', 'signup', 'invite', 'recovery', 'email_change'];
          const otpType = validTypes.includes(type) ? (type as any) : ('magiclink' as const);
          const { error } = await supa.auth.verifyOtp({ type: otpType, token_hash });
          if (error) throw error;
          if (!cancelled) {
            setStatus('Login confirmado! Redirecionando…');
            router.replace(next);
          }
          return;
        }

        // 3) Nada para confirmar → volta ao login
        if (!cancelled) {
          setStatus('Não há nada para confirmar. Redirecionando…');
          router.replace('/login');
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setStatus('Não foi possível confirmar o login. Redirecionando…');
          router.replace('/login');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params, router]);

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Autenticação</h1>
      <p>{status}</p>
    </div>
  );
}
