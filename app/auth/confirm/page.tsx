// app/auth/confirm/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

export const dynamic = 'force-dynamic';

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
  const [msg, setMsg] = useState<string>('A confirmar acesso…');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const u = new URL(window.location.href);
        const next = sanitizeNext(u.searchParams.get('next'));

        const token_hash =
          u.searchParams.get('token_hash') ||
          u.searchParams.get('token') ||
          u.searchParams.get('tokenHash');

        const type = (u.searchParams.get('type') as
          | 'magiclink'
          | 'recovery'
          | 'invite'
          | 'signup'
          | 'email_change'
          | null) ?? null;

        if (!token_hash || !type) {
          // Sem token => volta pro login sem “poluir”
          window.location.replace('/login');
          return;
        }

        // ✅ Fluxo multi-dispositivo: verifyOtp (sem PKCE)
        const { error: vErr } = await supa.auth.verifyOtp({ type, token_hash });
        if (vErr) throw vErr;

        // Agora a sessão está no client (localStorage) -> não entra em loop
        setMsg('A entrar…');

        // Decide destino por papel (tenta profiles, depois metadata)
        try {
          const { data: ud } = await supa.auth.getUser();
          const user = ud.user;

          const meta = (user?.user_metadata || {}) as Record<string, any>;
          let papel = (meta.app_role as string) || (meta.papel as string) || null;

          if (user?.id) {
            const { data: prof } = await supa
              .from('profiles')
              .select('papel')
              .eq('user_id', user.id)
              .maybeSingle();

            papel = (prof as any)?.papel || papel;
          }

          if (papel === 'admin' || papel === 'gestor') {
            window.location.replace('/adm/dashboard');
            return;
          }
        } catch {
          // se falhar, segue o next
        }

        window.location.replace(next);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || 'Falha ao confirmar acesso.');
        setMsg('Falha ao confirmar.');
      }
    })();

    return () => {
      alive = false;
    };
  }, [supa]);

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 420, margin: '0 auto' }}>
      <h1 style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>CONFIANCE</h1>
      <p style={{ color: '#49546A', marginTop: 0 }}>{msg}</p>
      {err ? <p style={{ color: 'crimson' }}>{err}</p> : null}
    </main>
  );
}
