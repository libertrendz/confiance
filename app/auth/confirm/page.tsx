// app/auth/confirm/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

export const dynamic = 'force-dynamic';

function getParams() {
  const href = window.location.href;
  const u = new URL(href);
  return {
    href,
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
    debug: u.searchParams.get('debug') === '1',
  };
}

export default function AuthConfirmPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [status, setStatus] = useState('Confirmando login…');
  const [debugOn, setDebugOn] = useState(false);
  const [debug, setDebug] = useState<Record<string, any>>({});

  useEffect(() => {
    let canceled = false;

    const run = async () => {
      const { href, code, token_hash, type, next, debug } = getParams();
      setDebugOn(Boolean(debug));
      const dbg = (k: string, v: any) => setDebug((d) => ({ ...d, [k]: v }));

      try {
        dbg('href', href);
        dbg('code', code || '');
        dbg('token_hash', token_hash || '');
        dbg('type', type || '');

        // 1) Fluxo moderno (?code=...)
        if (code) {
          setStatus('Confirmando login…');
          const { data, error } = await supa.auth.exchangeCodeForSession(href);
          dbg('exchange_error', error ?? null);
          dbg('exchange_data', data ?? null);
          if (error) throw error;
          if (canceled) return;
          setStatus('Login confirmado! Redirecionando…');
          window.location.replace(next || '/menu');
          return;
        }

        // 2) Fluxo antigo (token_hash + type)
        if (token_hash && type) {
          setStatus('Confirmando login…');
          const { data, error } = await supa.auth.verifyOtp({ type, token_hash });
          dbg('verify_error', error ?? null);
          dbg('verify_data', data ?? null);
          if (error) throw error;
          if (canceled) return;
          setStatus('Login confirmado! Redirecionando…');
          window.location.replace(next || '/menu');
          return;
        }

        // 3) Sem parâmetros: tenta sessão existente
        const { data } = await supa.auth.getSession();
        dbg('session_user', data?.session?.user?.id ?? null);
        if (data.session) {
          if (canceled) return;
          setStatus('Sessão ativa, redirecionando…');
          window.location.replace('/menu');
          return;
        }

        // 4) Nada útil: mensagem clara
        if (canceled) return;
        setStatus('Não foi possível confirmar. Sem code/token e sem sessão.');
      } catch (e: any) {
        if (canceled) return;
        dbg('caught_error', e?.message ?? String(e));
        setStatus(`Erro ao confirmar: ${e?.message ?? String(e)}`);
      }
    };

    run();
    return () => {
      canceled = true;
    };
  }, [supa]);

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Autenticação</h1>
      <p style={{ marginBottom: 16 }}>{status}</p>

      {debugOn && (
        <details open style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
          <summary style={{ cursor: 'pointer' }}>Detalhes técnicos</summary>
          <div style={{ marginTop: 12, fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: 13 }}>
            <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
              {Object.entries(debug).map(([k, v]) => (
                <li key={k} style={{ marginBottom: 8 }}>
                  <strong>{k}:</strong>{' '}
                  <span style={{ wordBreak: 'break-all' }}>
                    {typeof v === 'string' ? v : JSON.stringify(v)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}

      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={() => (window.location.href = '/login')}
          style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #ddd', cursor: 'pointer' }}
        >
          Voltar ao login
        </button>
        <button
          type="button"
          onClick={() => (window.location.href = '/')}
          style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #ddd', cursor: 'pointer' }}
        >
          Página inicial
        </button>
      </div>
    </main>
  );
}
