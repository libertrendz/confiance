'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

export const dynamic = 'force-dynamic';

function getParams() {
  const u = new URL(window.location.href);
  return {
    code: u.searchParams.get('code'),
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
    next: u.searchParams.get('next') || '/menu',
  };
}

export default function AuthConfirmPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [status, setStatus] = useState('Confirmando login…');
  const [details, setDetails] = useState<string | null>(null);

  useEffect(() => {
    const go = async () => {
      let done = false;
      try {
        const { code, token_hash, type, next } = getParams();

        // 1) Fluxo PKCE / OAuth com ?code=
        if (code) {
          const { error } = await supa.auth.exchangeCodeForSession(window.location.href);
          if (error) throw error;
          setStatus('Login confirmado! Redirecionando…');
          done = true;
          window.location.replace(next || '/menu');
          return;
        }

        // 2) Magic link tradicional (com token_hash + type)
        if (token_hash && type) {
          const { error } = await supa.auth.verifyOtp({ type, token_hash });
          if (error) throw error;
          setStatus('Login confirmado! Redirecionando…');
          done = true;
          window.location.replace(next || '/menu');
          return;
        }

        // 3) Sessão já existente
        const { data } = await supa.auth.getSession();
        if (data.session) {
          setStatus('Sessão ativa, redirecionando…');
          done = true;
          window.location.replace('/menu');
          return;
        }

        // 4) Nenhum token, nenhum code, nenhuma sessão
        setStatus('Não foi possível confirmar. Sem code/token e sem sessão.');
        setDetails(`href: ${window.location.href}`);
      } catch (err: any) {
        console.error('auth/confirm error:', err);
        setStatus('Erro ao confirmar login.');
        setDetails(err.message || String(err));
      } finally {
        // fallback final — só tenta se não tiver redirecionado
        setTimeout(() => {
          if (!done) window.location.replace('/login');
        }, 1500);
      }
    };

    go();
  }, [supa]);

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 520, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Autenticação</h1>
      <p>{status}</p>

      {details && (
        <pre
          style={{
            marginTop: 16,
            padding: 12,
            background: '#f9f9f9',
            border: '1px solid #eee',
            borderRadius: 8,
            fontSize: 12,
            color: '#333',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {details}
        </pre>
      )}

      <p style={{ marginTop: 24 }}>
        <a
          href="/login"
          style={{
            color: '#0070f3',
            textDecoration: 'underline',
          }}
        >
          Voltar ao login
        </a>
      </p>
    </main>
  );
}
