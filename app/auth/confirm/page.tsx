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

        // 1) Se já existe sessão, segue (sem inventar)
        const { data: s0 } = await supa.auth.getSession();
        if (!alive) return;
        if (s0.session?.user?.id) {
          setStep('ok');
          setMessage('Acesso confirmado. A entrar…');
          router.replace(next);
          return;
        }

        // 2) Fluxo token_hash + type (Invite e alguns links “antigos”)
        const token_hash =
          sp.get('token_hash') || sp.get('token') || sp.get('tokenHash');

        const type = (sp.get('type') || '') as
          | 'magiclink'
          | 'recovery'
          | 'invite'
          | 'signup'
          | 'email_change'
          | '';

        if (token_hash && type) {
          setMessage('A validar o link…');

          const { error } = await supa.auth.verifyOtp({ type, token_hash });
          if (!alive) return;

          if (error) {
            setStep('error');
            setMessage(error.message || 'Falha ao validar o link.');
            return;
          }

          // ✅ Regra de negócio: convite NÃO entra no app; manda pro login
          if (type === 'invite') {
            setStep('ok');
            setMessage('Convite aceite com sucesso. Agora solicite o Magic Link para entrar.');
            router.replace('/login?msg=invite_ok');
            return;
          }

          // outros tipos seguem o destino
          setStep('ok');
          setMessage('Acesso confirmado. A entrar…');
          router.replace(next);
          return;
        }

        // 3) Fluxo PKCE / code (Magic Link moderno)
        const code = sp.get('code') || sp.get('verification_code');
        if (code) {
          setMessage('A finalizar autenticação…');

          const { error } = await supa.auth.exchangeCodeForSession(window.location.href);
          if (!alive) return;

          if (error) {
            setStep('error');

            // mensagem “útil” sem loop
            const msg = (error.message || '').toLowerCase();
            if (msg.includes('invalid flow state')) {
              setMessage(
                'Este link foi aberto num navegador diferente do que pediu o Magic Link. Volte ao login e peça novamente, e abra o email no mesmo navegador.'
              );
            } else {
              setMessage(error.message || 'Falha ao concluir autenticação.');
            }
            return;
          }

          // ✅ Pós-login: decide destino por papel (sem depender do "next" do email)
          try {
            const { data: u } = await supa.auth.getUser();
            const uid = u.user?.id;
            if (uid) {
              const { data: prof } = await supa
                .from('profiles')
                .select('papel')
                .eq('user_id', uid)
                .maybeSingle();

              const papel = (prof as any)?.papel as string | undefined;
              if (papel === 'admin' || papel === 'gestor') {
                setStep('ok');
                setMessage('Acesso confirmado. A entrar…');
                router.replace('/adm/dashboard');
                return;
              }
            }
          } catch {
            // ignora e segue next
          }

          setStep('ok');
          setMessage('Acesso confirmado. A entrar…');
          router.replace(next);
          return;
        }

        // 4) Nada útil
        setStep('error');
        setMessage('Link inválido ou expirado. Volte ao login e peça um novo Magic Link.');
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
            Ir para o login
          </a>
        </div>
      </div>
    </main>
  );
}
