'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

export default function AuthConfirmPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Confirmando login…');

  // Criamos um cliente de browser local, sem depender de outros módulos
  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: true, autoRefreshToken: true } }
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Lê params diretamente do window para evitar warnings de Suspense
        const params = new URLSearchParams(window.location.search);
        const token_hash = params.get('token_hash');
        const type = (params.get('type') ?? 'magiclink') as
          | 'magiclink'
          | 'signup'
          | 'invite'
          | 'recovery'
          | 'email_change';
        const next = params.get('next') || '/menu';

        // Caso seja fluxo OAuth/PKCE (com ?code=...), tratamos também
        const code = params.get('code');
        if (code) {
          const { error } = await supa.auth.exchangeCodeForSession(code);
          if (error) throw error;
          if (!cancelled) router.replace(next);
          return;
        }

        // Fluxo de magic link (email) → usa token_hash
        if (!token_hash) {
          setStatus('Link inválido ou incompleto. Redirecionando para login…');
          setTimeout(() => router.replace('/login'), 1000);
          return;
        }

        const { error } = await supa.auth.verifyOtp({ type, token_hash });
        if (error) throw error;

        if (!cancelled) {
          setStatus('Login confirmado! Redirecionando…');
          setTimeout(() => router.replace(next), 600);
        }
      } catch (e: any) {
        console.error('Erro ao confirmar login:', e);
        if (!cancelled) {
          setStatus('Não foi possível confirmar o login. Redirecionando para o login…');
          setTimeout(() => router.replace('/login'), 1200);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, supa]);

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>A confirmar login…</h1>
      <p>{status}</p>
    </div>
  );
}
