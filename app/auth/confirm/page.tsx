'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import getBrowserSupabase from '../../../lib/supa';

export default function AuthConfirmPage() {
  const router = useRouter();
  const params = useSearchParams();

  const supa = useMemo(() => getBrowserSupabase(), []);
  const [status, setStatus] = useState('Confirmando login…');

  // next=/menu por padrão
  const next = decodeURIComponent(params.get('next') || '/menu');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // 1) PKCE: /auth/confirm?code=...
        const code = params.get('code');
        if (code) {
          const { error } = await supa.auth.exchangeCodeForSession(code);
          if (error) throw error;
          if (!cancelled) {
            setStatus('Login confirmado! Redirecionando…');
            router.replace(next);
          }
          return;
        }

        // 2) Magiclink clássico: /auth/confirm?type=magiclink&token_hash=...
        const tokenHash = params.get('token_hash');
        const type = params.get('type');
        if (tokenHash && type === 'magiclink') {
          // Para magiclink, não precisa de email ao usar token_hash
          const { error } = await supa.auth.verifyOtp({
            type: 'magiclink',
            token_hash: tokenHash,
          } as any); // tipagem de verifyOtp varia por overload
          if (error) throw error;

          if (!cancelled) {
            setStatus('Login confirmado! Redirecionando…');
            router.replace(next);
          }
          return;
        }

        // 3) Fragmento com access_token (#access_token=...) — edge case
        if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
          // Em alguns setups o getSessionFromUrl não aparece no tipo do SSR client; tentar via exchangeCodeForSession falha.
          // Se cair aqui, só redireciona — se já houver sessão, o /menu passa;
          // se não houver, /menu volta pra /login.
          router.replace(next);
          return;
        }

        // Nenhum formato reconhecido => tenta checar sessão; se não houver, volta ao login
        const { data } = await supa.auth.getSession();
        if (data.session) {
          router.replace(next);
        } else {
          setStatus('Link inválido ou expirado. Redirecionando ao login…');
          setTimeout(() => router.replace('/login'), 900);
        }
      } catch (e) {
        console.error('Auth confirm error:', e);
        setStatus('Não foi possível confirmar o login. Redirecionando…');
        setTimeout(() => router.replace('/login'), 900);
      }
    })();

    return () => { cancelled = true; };
  }, [params, router, supa, next]);

  return (
    <div style={{padding:24, fontFamily:'system-ui'}}>
      <h1 style={{fontSize:20, fontWeight:700, marginBottom:8}}>Autenticação</h1>
      <p>{status}</p>
    </div>
  );
}
