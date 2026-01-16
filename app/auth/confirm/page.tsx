// app/auth/confirm/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import getBrowserSupabase from '@/lib/supa';

export const dynamic = 'force-dynamic';

type Step = 'loading' | 'ok' | 'error';

function sanitizeNext(nextRaw: string | null) {
  if (!nextRaw) return '/menu';
  try {
    const url = new URL(nextRaw, 'http://x');
    const p = url.pathname + (url.search || '');
    return p.startsWith('/') ? p : '/menu';
  } catch {
    return '/menu';
  }
}

function parseHashParams() {
  if (typeof window === 'undefined') return new URLSearchParams();
  const h = window.location.hash || '';
  if (!h.startsWith('#')) return new URLSearchParams();
  return new URLSearchParams(h.slice(1));
}

export default function AuthConfirmPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const router = useRouter();
  const sp = useSearchParams();

  const [step, setStep] = useState<Step>('loading');
  const [message, setMessage] = useState<string>('A confirmar o acesso…');

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const next = sanitizeNext(sp.get('next'));

        // 0) Se já existe sessão, segue direto (não inventa fluxo)
        const { data: s0 } = await supa.auth.getSession();
        if (!alive) return;
        if (s0.session?.user?.id) {
          setStep('ok');
          setMessage('Acesso confirmado. A entrar…');
          router.replace(next);
          return;
        }

        // Parâmetros em QUERY
        const code = sp.get('code') || sp.get('verification_code');
        const token_hash = sp.get('token_hash') || sp.get('token') || sp.get('tokenHash');
        const typeQ = (sp.get('type') || '') as
          | 'magiclink'
          | 'recovery'
          | 'invite'
          | 'signup'
          | 'email_change'
          | '';

        // Parâmetros em HASH (#access_token=...&refresh_token=...&type=invite)
        const hp = parseHashParams();
        const access_token = hp.get('access_token');
        const refresh_token = hp.get('refresh_token');
        const typeH = (hp.get('type') || '') as
          | 'magiclink'
          | 'recovery'
          | 'invite'
          | 'signup'
          | 'email_change'
          | '';

        const effectiveType = typeQ || typeH;

        // 1) Fluxo HASH (muito comum no INVITE): access_token + refresh_token
        if (access_token && refresh_token) {
          setMessage('A validar o convite…');

          const { error } = await supa.auth.setSession({ access_token, refresh_token });
          if (!alive) return;

          if (error) {
            setStep('error');
            setMessage(error.message || 'Falha ao validar o convite.');
            return;
          }

          // Invite: sempre manda pro login (teu fluxo)
          if (effectiveType === 'invite') {
            setStep('ok');
            setMessage('Convite aceite. Agora pode pedir o Magic Link.');
            router.replace('/login?msg=invite_ok');
            return;
          }

          setStep('ok');
          setMessage('Acesso confirmado. A entrar…');
          router.replace(next);
          return;
        }

        // 2) Fluxo token_hash + type (compat)
        if (token_hash && effectiveType) {
          setMessage('A validar o link…');

          const { error } = await supa.auth.verifyOtp({
            type: effectiveType as any,
            token_hash,
          });

          if (!alive) return;

          if (error) {
            setStep('error');
            setMessage(error.message || 'Falha ao validar o link.');
            return;
          }

          if (effectiveType === 'invite') {
            setStep('ok');
            setMessage('Convite aceite. Agora pode pedir o Magic Link.');
            router.replace('/login?msg=invite_ok');
            return;
          }

          setStep('ok');
          setMessage('Acesso confirmado. A entrar…');
          router.replace(next);
          return;
        }

        // 3) Fluxo code (PKCE / alguns links modernos)
        if (code) {
          setMessage('A finalizar autenticação…');

          const { error } = await supa.auth.exchangeCodeForSession(window.location.href);

          if (!alive) return;

          if (error) {
            setStep('error');
            setMessage(error.message || 'Falha ao concluir autenticação.');
            return;
          }

          if (effectiveType === 'invite') {
            setStep('ok');
            setMessage('Convite aceite. Agora pode pedir o Magic Link.');
            router.replace('/login?msg=invite_ok');
            return;
          }

          setStep('ok');
          setMessage('Acesso confirmado. A entrar…');
          router.replace(next);
          return;
        }

        setStep('error');
        setMessage('Link inválido ou expirado. Volte a pedir o acesso.');
      } catch (e: any) {
        if (!alive) return;
        setStep('error');
        setMessage(e?.message || 'Erro inesperado.');
      }
    })();

    return () => {
      alive = false;
    };
  }, [supa, router, sp]);

  return (
    <main
      style={{
        padding: 24,
        fontFamily: 'system-ui',
        maxWidth: 520,
        margin: '0 auto',
      }}
    >
      <div
        style={{
          background: '#fff',
          border: '1px solid #E9EEF7',
          borderRadius: 16,
          padding: 16,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 800,
            color: '#0e3258',
          }}
        >
          {step === 'error' ? 'Não foi possível confirmar' : 'Confirmando acesso'}
        </h1>

        <p style={{ marginTop: 10, marginBottom: 0, color: '#49546A', fontSize: 13 }}>
          {message}
        </p>

        {step === 'error' && (
          <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a
              href="/login"
              style={{
                textDecoration: 'none',
                fontSize: 13,
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid #D7E3FF',
                background: '#fff',
                color: '#0e3258',
                fontWeight: 800,
              }}
            >
              Voltar ao login
            </a>

            <a
              href="/login"
              style={{
                textDecoration: 'none',
                fontSize: 13,
                padding: '10px 12px',
                borderRadius: 10,
                border: 'none',
                background: '#0e3258',
                color: '#fff',
                fontWeight: 800,
              }}
            >
              Pedir Magic Link
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
