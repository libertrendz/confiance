// app/auth/callback/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

function sanitizeNext(nextRaw: string | null): string {
  if (!nextRaw) return '/menu';
  try {
    const url = new URL(nextRaw, 'http://x');
    const p = url.pathname + (url.search || '');
    return p.startsWith('/') ? p : '/menu';
  } catch {
    return '/menu';
  }
}

export default function AuthCallbackPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [msg, setMsg] = useState('A confirmar sessão…');

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const url = new URL(window.location.href);
        const next = sanitizeNext(url.searchParams.get('next'));

        const code = url.searchParams.get('code');
        const errorDesc = url.searchParams.get('error_description') || url.searchParams.get('error');

        if (errorDesc) {
          window.location.replace(`/login?err=${encodeURIComponent(errorDesc)}`);
          return;
        }

        if (code) {
          // PKCE: troca o code por sessão no CLIENT (tem code_verifier)
          const { error } = await supa.auth.exchangeCodeForSession(code);
          if (error) {
            window.location.replace(`/login?err=${encodeURIComponent(error.message || 'code_exchange_failed')}`);
            return;
          }
          window.location.replace(next);
          return;
        }

        // fallback: se veio token_hash, delega pro confirm route
        const token_hash = url.searchParams.get('token_hash') || url.searchParams.get('token');
        const type = url.searchParams.get('type');
        if (token_hash && type) {
          window.location.replace(`/auth/confirm?token_hash=${encodeURIComponent(token_hash)}&type=${encodeURIComponent(type)}&next=${encodeURIComponent(next)}`);
          return;
        }

        // nada útil
        window.location.replace('/login?err=missing_code_or_token');
      } catch (e: any) {
        if (!alive) return;
        window.location.replace(`/login?err=${encodeURIComponent(e?.message || 'callback_failed')}`);
      } finally {
        if (alive) setMsg('A concluir…');
      }
    })();

    return () => {
      alive = false;
    };
  }, [supa]);

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 420, margin: '0 auto' }}>
      <p style={{ color: '#666' }}>{msg}</p>
    </main>
  );
}
