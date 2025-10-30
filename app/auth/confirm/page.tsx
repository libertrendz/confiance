// app/auth/confirm/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

export const dynamic = 'force-dynamic';

function getParams() {
  const u = new URL(window.location.href);
  return {
    token_hash:
      u.searchParams.get('token_hash') ||
      u.searchParams.get('token') ||
      u.searchParams.get('tokenHash'),
    type:
      (u.searchParams.get('type') as
        | 'magiclink'
        | 'recovery'
        | 'invite'
        | 'signup'
        | 'email_change'
        | null) || null,
    code: u.searchParams.get('code'),
    next: u.searchParams.get('next') || '/menu',
  };
}

export default function AuthConfirmPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [status, setStatus] = useState('Confirmando login…');

  useEffect(() => {
    let done = false;

    const go = async () => {
      try {
        const { token_hash, type, code, next } = getParams();

        // 1) Fluxo moderno (PKCE / OAuth): veio ?code=...
        if (code) {
          // CORREÇÃO: precisa da URL completa no mobile
          const { error } = await supa.auth.exchangeCodeForSession(window.location.href);
          if (error) throw error;

          setStatus('Login confirmado! Redirecionando…');
          done = true;
          // HARD redirect elimina ruídos de roteamento
          window.location.replace(next || '/menu');
          return;
        }

        // 2) Magic link tradicional: token_hash + type
        if (token_hash && type) {
          const { error } = await supa.auth.verifyOtp({ type, token_hash });
          if (error) throw error;

          setStatus('Login confirmado! Redirecionando…');
          done = true;
          window.location.replace(next || '/menu');
          return;
        }

        // 3) Sem parâmetros úteis: tenta sessão existente
        const { data } = await supa.auth.getSession();
        if (data.session) {
          setStatus('Sessão ativa, redirecionando…');
          done = true;
          window.location.replace('/menu');
          return;
        }

        // 4) Falhou tudo: volta ao login, sem loops
        setStatus('Não foi possível confirmar. Voltando ao login…');
        window.location.replace('/login');
      } catch (e: any) {
        console.error('auth/confirm error:', e);
        setStatus('Não foi possível confirmar. Voltando ao login…');
        window.location.replace('/login');
      } finally {
        // Removido o fallback que empurrava /menu sem sessão
        // Isso evitava loop “A redirecionar…” no mobile.
        void done;
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
