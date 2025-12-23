// app/auth/confirm/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

export const dynamic = 'force-dynamic';

function sanitizeNext(nextRaw: string | null) {
  if (!nextRaw) return '/menu';
  try {
    const u = new URL(nextRaw, 'http://x');
    const p = u.pathname + (u.search || '');
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

        // 1) Fluxo moderno (PKCE): ?code=...
        const code = url.searchParams.get('code') || url.searchParams.get('verification_code');
        if (code) {
          const { error } = await supa.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          // 2) Fluxo legacy: token_hash + type
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
            // 3) Já existe sessão?
            const { data } = await supa.auth.getSession();
            if (!data.session) {
              window.location.replace('/login?err=missing_code_or_token');
              return;
            }
          }
        }

        // Decide destino por papel (admin/gestor -> dashboard)
        const { data: ud } = await supa.auth.getUser();
        const uid = ud.user?.id;
        let papel: string | null = null;

        if (uid) {
          const { data: prof } = await supa
            .from('profiles')
            .select('papel')
            .eq('user_id', uid)
            .maybeSingle();
          papel = (prof as any)?.papel ?? null;
        }

        const destino = papel === 'admin' || papel === 'gestor' ? '/adm/dashboard' : next;

        if (!alive) return;
        setMsg('A entrar…');
        window.location.replace(destino);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || 'Falha ao confirmar acesso.');
        setMsg('Falha ao confirmar acesso.');
      }
    })();

    return () => {
      alive = false;
    };
  }, [supa]);

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 420, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 10 }}>A validar…</h1>
      <p style={{ color: '#49546A', margin: 0 }}>{msg}</p>
      {err && <p style={{ color: 'crimson', marginTop: 12 }}>{err}</p>}
    </main>
  );
}
