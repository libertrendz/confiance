// app/auth/confirm/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

export const dynamic = 'force-dynamic';

function sanitizeNext(nextRaw: string | null): string {
  if (!nextRaw) return '/menu';
  try {
    const u = new URL(nextRaw, window.location.origin);
    const p = u.pathname + (u.search || '');
    return p.startsWith('/') ? p : '/menu';
  } catch {
    return '/menu';
  }
}

export default function AuthConfirmPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [status, setStatus] = useState<'working' | 'error'>('working');
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const url = new URL(window.location.href);
        const next = sanitizeNext(url.searchParams.get('next'));

        // 0) Se já tiver sessão, só redireciona
        const { data: pre } = await supa.auth.getSession();
        if (!alive) return;
        if (pre.session?.user?.id) {
          // tenta role pra mandar pro dashboard quando for admin/gestor
          try {
            const uid = pre.session.user.id;
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
          } catch {}
          window.location.replace(next);
          return;
        }

        // 1) Caminho feliz (PKCE): troca o code pela sessão usando a URL completa
        // (é isso que estava no teu GenesysRef como “padrão estável”)
        const { error: exErr } = await supa.auth.exchangeCodeForSession(window.location.href);

        // Se PKCE falhar, tenta fallback legado (token_hash + type)
        if (exErr) {
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
            const { error: otpErr } = await supa.auth.verifyOtp({ type, token_hash });
            if (otpErr) throw otpErr;
          } else {
            // não tem nem code nem token_hash válido
            throw exErr;
          }
        }

        // 2) Confirma sessão e decide destino (admin/gestor => dashboard)
        const { data: post } = await supa.auth.getSession();
        if (!alive) return;

        const uid = post.session?.user?.id;
        if (!uid) throw new Error('Sessão não criada');

        try {
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
        } catch {
          // se falhar ler papel, cai no next
        }

        window.location.replace(next);
      } catch (e: any) {
        const m = String(e?.message || 'Falha ao confirmar login');
        if (!alive) return;
        setStatus('error');
        setErrMsg(m);
        window.location.replace(`/login?err=${encodeURIComponent(m)}`);
      }
    })();

    return () => {
      alive = false;
    };
  }, [supa]);

  // UI simples, sem firula (e não interfere no login page)
  return (
    <main style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 520, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Confirmando acesso…</h1>
      <p style={{ marginTop: 10, color: '#64728a' }}>
        Aguarde um instante.
      </p>

      {status === 'error' && (
        <p style={{ marginTop: 10, color: 'crimson' }}>
          {errMsg || 'Falha ao confirmar.'}
        </p>
      )}
    </main>
  );
}
