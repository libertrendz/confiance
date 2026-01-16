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

function isLikelyConsumedOrExpiredInvite(msg: string) {
  const m = (msg || '').toLowerCase();
  return (
    m.includes('expired') ||
    m.includes('invalid') ||
    m.includes('not found') ||
    m.includes('link') ||
    m.includes('token') ||
    m.includes('already') ||
    m.includes('used')
  );
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

        const code = sp.get('code') || sp.get('verification_code');

        const token_hash =
          sp.get('token_hash') || sp.get('token') || sp.get('tokenHash');

        const type = (sp.get('type') || '') as
          | 'magiclink'
          | 'recovery'
          | 'invite'
          | 'signup'
          | 'email_change'
          | '';

        // 0) Se já existe sessão, só segue (não inventa)
        const { data: s0 } = await supa.auth.getSession();
        if (!alive) return;

        if (s0.session?.user?.id) {
          setStep('ok');
          setMessage('Acesso confirmado. A entrar…');
          router.replace(next);
          return;
        }

        // 1) token_hash + type (invite e compatibilidade)
        if (token_hash && type) {
          setMessage('A validar o link…');

          const { error } = await supa.auth.verifyOtp({ type, token_hash });

          if (!alive) return;

          if (error) {
            // ✅ Invite: se já foi consumido/expirou, não assusta o utilizador
            if (type === 'invite' && isLikelyConsumedOrExpiredInvite(error.message || '')) {
              setStep('ok');
              setMessage('Convite confirmado. Agora pode entrar pelo Magic Link.');
              router.replace('/login?msg=invite_ok');
              return;
            }

            setStep('error');
            setMessage(error.message || 'Falha ao validar o link.');
            return;
          }

          // Invite: sempre manda para login (fluxo esperado)
          if (type === 'invite') {
            setStep('ok');
            setMessage('Convite aceite com sucesso. Agora pode entrar pelo Magic Link.');
            router.replace('/login?msg=invite_ok');
            return;
          }

          // Outros tipos: segue next
          setStep('ok');
          setMessage('Acesso confirmado. A entrar…');
          router.replace(next);
          return;
        }

        // 2) code (PKCE / magic link moderno)
        if (code) {
          setMessage('A finalizar autenticação…');

          const { error } = await supa.auth.exchangeCodeForSession(window.location.href);

          if (!alive) return;

          if (error) {
            setStep('error');
            setMessage(error.message || 'Falha ao concluir autenticação.');
            return;
          }

          setStep('ok');
          setMessage('Acesso confirmado. A entrar…');
          router.replace(next);
          return;
        }

        // 3) nada útil
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
    <main style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 520, margin: '0 auto' }}>
      <div style={{ background: '#fff', border: '1px solid #E9EEF7', borderRadius: 16, padding: 16 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0e3258' }}>
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
          </div>
        )}
      </div>
    </main>
  );
}
