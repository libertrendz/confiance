// app/auth/callback/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

export const dynamic = 'force-dynamic';

function getParams() {
  const u = new URL(window.location.href);
  return {
    token_hash: u.searchParams.get('token_hash') || u.searchParams.get('token') || u.searchParams.get('tokenHash'),
    type: (u.searchParams.get('type') as 'magiclink' | 'recovery' | 'invite' | 'signup' | 'email_change' | null) || null,
    code: u.searchParams.get('code') || u.searchParams.get('verification_code'),
    next: u.searchParams.get('next') || '/menu',
  };
}

export default function AuthCallbackPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [status, setStatus] = useState('Confirmando login…');

  useEffect(() => {
    let done = false;

    const go = async () => {
      try {
        const { token_hash, type, code, next } = getParams();

        // 1) PKCE / OAuth: veio ?code=
        if (code) {
          const { error } = await supa.auth.exchangeCodeForSession(window.location.href);
          if (error) throw error;
          done = true;
          setStatus('Login confirmado! Redirecionando…');
          window.location.replace(next);
          return;
        }

        // 2) Magic link antigo: ?token_hash=&type=magiclink
        if (token_hash && type) {
          const { error } = await supa.auth.verifyOtp({ type, token_hash });
          if (error) throw error;
          done = true;
          setStatus('Login confirmado! Redirecionando…');
          window.location.replace(next);
          return;
        }

        // 3) Já tem sessão?
        const { data } = await supa.auth.getSession();
        if (data.session?.user?.id) {
          done = true;
          setStatus('Sessão ativa! Redirecionando…');
          window.location.replace(next);
          return;
        }

        // 4) Fallback webview: tokens no hash #access_token=...
        const hash = window.location.hash;
        if (hash.includes('access_token')) {
          const params = new URLSearchParams(hash.replace(/^#/, ''));
          const access_token = params.get('access_token') || '';
          const refresh_token = params.get('refresh_token') || '';
          if (access_token && refresh_token) {
            const { error } = await supa.auth.setSession({ access_token, refresh_token });
            if (error) throw error;
            done = true;
            setStatus('Login confirmado (fallback)! Redirecionando…');
            window.location.replace(next);
            return;
          }
        }

        // 5) Falhou tudo
        setStatus('Não foi possível confirmar. Voltando ao login…');
        window.location.replace('/login');
      } catch (e) {
        console.error('auth/callback error:', e);
        setStatus('Erro ao confirmar. Voltando ao login…');
        window.location.replace('/login');
      } finally {
        setTimeout(() => {
          if (!done) window.location.replace('/menu');
        }, 1500);
      }
    };

    go();
  }, [supa]);

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 520, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Autenticação</h1>
      <p>{status}</p>
    </div>
  );
}
