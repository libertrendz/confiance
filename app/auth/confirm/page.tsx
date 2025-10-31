// app/auth/confirm/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

export const dynamic = 'force-dynamic';

type Step =
  | 'idle'
  | 'reading_url'
  | 'trying_exchange'
  | 'exchange_success'
  | 'trying_legacy'
  | 'legacy_success'
  | 'checking_session'
  | 'session_ok'
  | 'error';

function getParams() {
  const href = window.location.href;
  const u = new URL(href);
  const code = u.searchParams.get('code') || '';
  const token_hash =
    u.searchParams.get('token_hash') ||
    u.searchParams.get('token') ||
    u.searchParams.get('tokenHash') ||
    '';
  const type =
    (u.searchParams.get('type') as
      | 'magiclink'
      | 'recovery'
      | 'invite'
      | 'signup'
      | 'email_change'
      | null) || null;
  const next = u.searchParams.get('next') || '/menu';
  return { href, code, token_hash, type, next };
}

export default function AuthConfirmPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [step, setStep] = useState<Step>('idle');
  const [debug, setDebug] = useState<any>({});
  const [status, setStatus] = useState('Confirmando login…');

  useEffect(() => {
    const go = async () => {
      setStep('reading_url');
      const { href, code, token_hash, type, next } = getParams();
      setDebug((d: any) => ({ ...d, href, code, token_hash, type, next }));

      try {
        if (code) {
          setStep('trying_exchange');
          setStatus('Confirmando login…');
          const { data, error } = await supa.auth.exchangeCodeForSession(href);
          setDebug((d: any) => ({ ...d, exchange_error: error ?? null, exchange_data: data ?? null }));
          if (error) throw error;

          setStep('exchange_success');
          setStatus('Login confirmado! Redirecionando…');
          window.location.replace(next || '/menu');
          return;
        }

        if (token_hash && type) {
          setStep('trying_legacy');
          setStatus('Confirmando login (formato antigo)…');
          const { data, error } = await supa.auth.verifyOtp({ type, token_hash });
          setDebug((d: any) => ({ ...d, legacy_error: error ?? null, legacy_data: data ?? null }));
          if (error) throw error;

          setStep('legacy_success');
          setStatus('Login confirmado! Redirecionando…');
          window.location.replace(next || '/menu');
          return;
        }

        // Sem parâmetros úteis: tenta sessão
        setStep('checking_session');
        const { data } = await supa.auth.getSession();
        setDebug((d: any) => ({ ...d, session_at_check: data?.session?.user?.id ?? null }));
        if (data.session) {
          setStep('session_ok');
          setStatus('Sessão ativa, redirecionando…');
          window.location.replace('/menu');
          return;
        }

        // Nada deu: erro visível
        setStep('error');
        setStatus('Não foi possível confirmar. Sem code/token e sem sessão.');
      } catch (e: any) {
        setStep('error');
        const msg = e?.message || String(e);
        setDebug((d: any) => ({ ...d, caught_error: msg }));
        setStatus(`Erro ao confirmar: ${msg}`);
      }
    };

    go();
  }, [supa]);

  const rows: Array<[string, any]> = Object.entries(debug || {}).map(([k, v]) => [k, v]);

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Autenticação</h1>
      <p style={{ marginBottom: 12 }}>{status}</p>
      <p style={{ marginBottom: 16, color: '#666' }}>
        Passo: <code>{step}</code>
      </p>

      {/* Debug visível (mobile e desktop) */}
      <details open style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
        <summary style={{ cursor: 'pointer' }}>Detalhes técnicos</summary>
        <div style={{ marginTop: 12, fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: 13 }}>
          {rows.length === 0 ? (
            <em>Nenhum detalhe ainda.</em>
          ) : (
            <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
              {rows.map(([k, v]) => (
                <li key={k} style={{ marginBottom: 8 }}>
                  <strong>{k}:</strong>{' '}
                  <span style={{ wordBreak: 'break-all' }}>
                    {typeof v === 'string' ? v : JSON.stringify(v)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>

      {step === 'error' && (
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
            Ir para a página inicial
          </button>
        </div>
      )}
    </main>
  );
}
