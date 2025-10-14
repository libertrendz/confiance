// app/login/page.tsx
'use client';

export const dynamic = 'force-dynamic'; // não pré-renderiza estaticamente
export const revalidate = 0;

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getBrowserSupabase } from '@/lib/supa-browser';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/menu';

  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const supa = getBrowserSupabase();

        // 1) Se já tem sessão, pula pro menu
        const { data: sess } = await supa.auth.getSession();
        if (sess.session) {
          router.replace(next);
          return;
        }

        // 2) Se vier de magic link (hash na URL), troca por sessão e segue
        if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
          const { error } = await supa.auth.getSessionFromUrl({ storeSession: true });
          if (error) {
            setErr(`Não foi possível confirmar o login: ${error.message}`);
            setChecking(false);
            return;
          }
          router.replace(next);
          return;
        }

        setChecking(false);
      } catch (e: any) {
        setErr(e?.message ?? 'Erro inesperado ao preparar a tela de login.');
        setChecking(false);
      }
    })();
  }, [router, next]);

  async function enviarMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);

    try {
      const supa = getBrowserSupabase();
      const { error } = await supa.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) setErr(error.message);
      else setMsg('Enviámos um link de acesso para o seu email.');
    } catch (e: any) {
      setErr(e?.message ?? 'Falha ao enviar magic link.');
    }
  }

  if (checking) return <div style={{ padding: 24, fontFamily: 'system-ui' }}>A preparar…</div>;

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 480, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Entrar</h1>

      <form onSubmit={enviarMagicLink} style={{ display: 'grid', gap: 8 }}>
        <label>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ display: 'block', width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 8 }}
          />
        </label>

        <button
          type="submit"
          style={{ padding: '10px 14px', border: '1px solid #111', background: '#111', color: '#fff', borderRadius: 8 }}
        >
          Enviar Magic Link
        </button>
      </form>

      {msg && <p style={{ marginTop: 8, color: '#14532d' }}>{msg}</p>}
      {err && <p style={{ marginTop: 8, color: '#7f1d1d' }}>{err}</p>}
    </div>
  );
}
