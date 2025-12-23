// app/auth/confirm/page.tsx
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

export default function AuthConfirmPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [msg, setMsg] = useState('A confirmar acesso…');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const url = new URL(window.location.href);
        const next = sanitizeNext(url.searchParams.get('next'));

        const code = url.searchParams.get('code') || url.searchParams.get('verification_code');

        const token_hash =
          url.searchParams.get('token_hash') ||
          url.searchParams.get('token') ||
          url.searchParams.get('tokenHash');

        const type = url.searchParams.get('type') as
          | 'magiclink'
          | 'recovery'
          | 'invite'
          | 'signup'
          | 'email_change'
          | null;

        // 1) PKCE/code flow (mais comum no Supabase recente)
        if (code) {
          const { error } = await supa.auth.exchangeCodeForSession(code);
          if (error) throw error;

          if (!alive) return;
          window.location.replace(next);
          return;
        }

        // 2) token_hash flow (alguns convites/links)
        if (token_hash && type) {
          const { error } = await supa.auth.verifyOtp({ type, token_hash });
          if (error) throw error;

          if (!alive) return;
          window.location.replace(next);
          return;
        }

        // 3) fallback: se já existe sessão, segue
        const { data } = await supa.auth.getSession();
        if (data.session) {
          window.location.replace(next);
          return;
        }

        throw new Error('missing_code_or_token');
      } catch (e: any) {
        console.error('AuthConfirm error', e);
        if (!alive) return;
        const emsg = e?.message || 'Falha ao confirmar acesso.';
        setErr(emsg);
        setMsg('Não foi possível confirmar o acesso.');
      }
    })();

    return () => {
      alive = false;
    };
  }, [supa]);

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 520, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 10, color: '#0e3258' }}>
        Confirmando…
      </h1>

      <p style={{ color: '#49546A', marginTop: 0 }}>{msg}</p>

      {err && (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 12, border: '1px solid #FFD7D7', background: '#FFF5F5' }}>
          <div style={{ fontWeight: 800, color: 'crimson', marginBottom: 6 }}>Erro</div>
          <div style={{ color: '#7a1f1f' }}>{err}</div>
          <a
            href="/login"
            style={{
              display: 'inline-block',
              marginTop: 10,
              textDecoration: 'none',
              fontWeight: 800,
              color: '#0e3258',
            }}
          >
            Voltar ao login
          </a>
        </div>
      )}
    </main>
  );
}
