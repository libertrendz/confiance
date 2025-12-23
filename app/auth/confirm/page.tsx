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

        // 1) PKCE / “novo”: ?code=...
        const code =
          url.searchParams.get('code') ||
          url.searchParams.get('verification_code');

        if (code) {
          const { error } = await supa.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          // 2) “antigo”: token_hash + type
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

          if (token_hash && type) {
            const { error } = await supa.auth.verifyOtp({ type, token_hash });
            if (error) throw error;
          } else {
            // 3) já existe sessão?
            const { data } = await supa.auth.getSession();
            if (!data.session) {
              throw new Error('missing_code_or_token');
            }
          }
        }

        // Decide destino por papel (regra de negócio)
        const { data: ud } = await supa.auth.getUser();
        const uid = ud.user?.id ?? null;

        let destino = next;

        if (uid) {
          const { data: prof } = await supa
            .from('profiles')
            .select('papel')
            .eq('user_id', uid)
            .maybeSingle();

          const papel = (prof as any)?.papel as string | undefined;
          if (papel === 'admin' || papel === 'gestor') {
            destino = '/adm/dashboard';
          } else {
            destino = '/menu';
          }
        }

        if (!alive) return;
        window.location.replace(destino);
      } catch (e: any) {
        console.error('AuthConfirm error', e);
        if (!alive) return;
        const m = e?.message || 'Falha ao confirmar acesso.';
        setErr(m);
        setMsg('Não foi possível confirmar o acesso.');
        // manda pro login com erro (sem loop)
        window.location.replace(`/login?err=${encodeURIComponent(m)}`);
      }
    })();

    return () => {
      alive = false;
    };
  }, [supa]);

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 520, margin: '0 auto' }}>
      <h1 style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>Aguarde</h1>
      <p style={{ color: '#49546A', margin: 0 }}>{msg}</p>
      {err && <p style={{ color: 'crimson', marginTop: 10 }}>{err}</p>}
    </main>
  );
}
