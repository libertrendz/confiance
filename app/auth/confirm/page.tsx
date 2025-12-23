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
  const [msg, setMsg] = useState('A confirmar…');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const url = new URL(window.location.href);
        const next = sanitizeNext(url.searchParams.get('next'));

        const code =
          url.searchParams.get('code') ||
          url.searchParams.get('verification_code');

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

        // 1) Fluxo PKCE/code -> precisa rodar no browser (tem code_verifier)
        if (code) {
          setMsg('A finalizar sessão…');
          const { error } = await supa.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }
        // 2) Fluxo token_hash/type (OTP antigo)
        else if (token_hash && type) {
          setMsg('A verificar acesso…');
          const { error } = await supa.auth.verifyOtp({ type, token_hash });
          if (error) throw error;
        } else {
          // 3) Já existe sessão?
          const { data } = await supa.auth.getSession();
          if (!data.session) {
            throw new Error('missing_code_or_token');
          }
        }

        // 4) Redireciona por papel (regra de negócio)
        const { data: ud } = await supa.auth.getUser();
        const uid = ud.user?.id ?? null;

        if (uid) {
          const { data: prof } = await supa
            .from('profiles')
            .select('papel')
            .eq('user_id', uid)
            .maybeSingle();

          const papel = (prof as any)?.papel as string | undefined;
          if (papel === 'admin' || papel === 'gestor') {
            window.location.replace('/adm/dashboard');
            return;
          }
        }

        window.location.replace(next);
      } catch (e: any) {
        console.error('auth/confirm error', e);
        if (!alive) return;
        setErr(e?.message || 'Falha ao confirmar acesso.');
        setMsg('Não foi possível confirmar.');
        // volta pro login com erro
        const safe = encodeURIComponent(e?.message || 'auth_confirm_failed');
        window.location.replace(`/login?err=${safe}`);
      }
    })();

    return () => {
      alive = false;
    };
  }, [supa]);

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 520, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Entrando…</h1>
      <p style={{ color: '#49546A' }}>{msg}</p>
      {err && <p style={{ color: 'crimson', marginTop: 10 }}>{err}</p>}
    </main>
  );
}
