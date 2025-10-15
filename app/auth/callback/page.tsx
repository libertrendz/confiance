'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      // PKCE é o fluxo recomendado. Se o link vier com ?code=..., usamos exchangeCodeForSession.
      // Se vier no formato antigo (#access_token=...), fazemos fallback com setSession.
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      // Vamos tratar a URL manualmente; deixar false evita tentativas automáticas em SSR.
      detectSessionInUrl: false,
    },
  }
);

function parseHashTokens(hash: string): { access_token?: string; refresh_token?: string } {
  // hash vem como "#access_token=...&expires_in=...&refresh_token=...&token_type=bearer"
  const out: { access_token?: string; refresh_token?: string } = {};
  const trimmed = hash.startsWith('#') ? hash.slice(1) : hash;
  const pairs = trimmed.split('&').map((p) => p.split('='));
  for (const [k, v] of pairs) {
    if (k === 'access_token') out.access_token = decodeURIComponent(v || '');
    if (k === 'refresh_token') out.refresh_token = decodeURIComponent(v || '');
  }
  return out;
}

export default function CallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Confirmando login…');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // 1) Descobre o "next" (para onde vamos após logar)
        const url = new URL(window.location.href);
        const next = url.searchParams.get('next') || '/menu';

        // 2) Tenta fluxo PKCE (?code=...)
        const code = url.searchParams.get('code');
        if (code) {
          setStatus('Validando código de login…');
          const { error } = await supa.auth.exchangeCodeForSession(code);
          if (error) throw error;

          // limpa o ?code= da URL (opcional)
          window.history.replaceState(null, '', `${url.origin}${url.pathname}?next=${encodeURIComponent(next)}`);

          if (!cancelled) {
            setStatus('Login confirmado! Redirecionando…');
            router.replace(next);
          }
          return;
        }

        // 3) Fallback para links antigos: hash com access_token / refresh_token
        if (window.location.hash.includes('access_token')) {
          setStatus('Validando token de acesso…');
          const { access_token, refresh_token } = parseHashTokens(window.location.hash);
          if (access_token && refresh_token) {
            const { error } = await supa.auth.setSession({ access_token, refresh_token });
            if (error) throw error;

            // remove o hash da URL
            window.history.replaceState(null, '', `${url.origin}${url.pathname}?next=${encodeURIComponent(next)}`);

            if (!cancelled) {
              setStatus('Login confirmado! Redirecionando…');
              router.replace(next);
            }
            return;
          }
        }

        // 4) Se chegou aqui, não tem code nem tokens => volta para login
        setStatus('Não foi possível confirmar o login. Redirecionando…');
        router.replace('/login?err=invalid_callback');
      } catch (e: any) {
        console.error('Callback error:', e?.message || e);
        setStatus('Não foi possível confirmar o login. Redirecionando…');
        router.replace('/login?err=callback_failed');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div style={{padding: 24, fontFamily: 'system-ui', maxWidth: 520, margin: '0 auto'}}>
      <h1 style={{fontSize: 20, fontWeight: 700, marginBottom: 8}}>Confirmando login…</h1>
      <p>{status}</p>
    </div>
  );
}
