// app/auth/callback/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

export const dynamic = 'force-dynamic';

function safeNext(nextRaw: string | null) {
  if (!nextRaw) return '/menu';
  if (nextRaw.startsWith('/')) return nextRaw; // só path interno
  return '/menu';
}

function getParams() {
  const u = new URL(window.location.href);

  const token_hash =
    u.searchParams.get('token_hash') ||
    u.searchParams.get('token') ||
    u.searchParams.get('tokenHash');

  const type =
    (u.searchParams.get('type') as
      | 'magiclink'
      | 'recovery'
      | 'invite'
      | 'signup'
      | 'email_change'
      | null) || null;

  const code = u.searchParams.get('code') || u.searchParams.get('verification_code');

  const next = safeNext(u.searchParams.get('next') || '/menu');

  return { token_hash, type, code, next };
}

function hasHashTokens() {
  const hash = window.location.hash || '';
  return hash.includes('access_token') && hash.includes('refresh_token');
}

export default function AuthCallbackPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [status, setStatus] = useState('Confirmando login…');

  useEffect(() => {
    let alive = true;

    const run = async () => {
      try {
        const { token_hash, type, code, next } = getParams();

        // 1) PKCE: veio ?code=
        // NÃO fazer signOut antes, senão pode apagar o code_verifier.
        if (code) {
          setStatus('Confirmando login…');
          const { error } = await supa.auth.exchangeCodeForSession(window.location.href);
          if (error) throw error;

          if (!alive) return;
          setStatus('Login confirmado! Redirecionando…');
          window.location.replace(next);
          return;
        }

        // 2) Magic link clássico: ?token_hash=&type=magiclink
        if (token_hash && type) {
          setStatus('Confirmando login…');
          const { error } = await supa.auth.verifyOtp({ type, token_hash });
          if (error) throw error;

          if (!alive) return;
          setStatus('Login confirmado! Redirecionando…');
          window.location.replace(next);
          return;
        }

        // 3) Fallback webview: tokens no hash
        if (hasHashTokens()) {
          setStatus('Confirmando login…');
          const params = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
          const access_token = params.get('access_token') || '';
          const refresh_token = params.get('refresh_token') || '';

          const { error } = await supa.auth.setSession({ access_token, refresh_token });
          if (error) throw error;

          if (!alive) return;
          setStatus('Login confirmado! Redirecionando…');
          window.location.replace(next);
          return;
        }

        // 4) Se não veio nada no URL, só redireciona se já existe sessão
        const { data } = await supa.auth.getSession();
        if (data.session?.user?.id) {
          if (!alive) return;
          setStatus('Sessão ativa! Redirecionando…');
          window.location.replace(next);
          return;
        }

        if (!alive) return;
        setStatus('Link inválido/expirado. Voltando ao login…');
        window.location.replace('/login?err=Link%20inv%C3%A1lido%20ou%20expirado');
      } catch (e: any) {
        console.error('auth/callback error:', e);
        if (!alive) return;

        setStatus('Erro ao confirmar. Voltando ao login…');
        window.location.replace(
          `/login?err=${encodeURIComponent(e?.message || 'Falha ao efetuar login')}`
        );
      }
    };

    run();

    return () => {
      alive = false;
    };
  }, [supa]);

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 520, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Autenticação</h1>
      <p>{status}</p>
    </div>
  );
}
