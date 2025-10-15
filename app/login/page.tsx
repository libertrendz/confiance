'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false, // vamos tratar manualmente
    },
  }
);

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/menu';

  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 1) Se já tiver sessão, vai pro menu
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supa.auth.getUser();
        if (data.user) {
          router.replace(next);
          return;
        }
        // 2) Se veio com ?code=... (PKCE) ou hash #access_token..., manda para o callback
        const hasCode = typeof window !== 'undefined' && new URL(window.location.href).searchParams.get('code');
        const hasHash = typeof window !== 'undefined' && window.location.hash.includes('access_token');
        if (hasCode || hasHash) {
          const url = new URL(window.location.href);
          const n = url.searchParams.get('next') || next;
          // usa window.location.replace para preservar o hash (#...)
          window.location.replace(`/auth/callback?next=${encodeURIComponent(n)}${url.search}${window.location.hash}`);
          return;
        }
      } catch (e: any) {
        // só loga, não bloqueia
        console.warn('login precheck:', e?.message || e);
      } finally {
        setLoading(false);
      }
    })();
  }, [router, next]);

  async function enviarMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supa.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;
      setMsg('Enviámos um link de acesso para o seu email.');
    } catch (e: any) {
      setErr(e?.message ?? 'Não foi possível enviar o link.');
    }
  }

  if (loading) return <div style={{ padding: 24, fontFamily: 'system-ui' }}>A carregar…</div>;

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 520, margin: '0 auto' }}>
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
      {err && <p style={{ marginTop: 8, color: '#7f1d1d' }}>Erro: {err}</p>}

      <p style={{ marginTop: 16, fontSize: 12, color: '#555' }}>
        Depois de clicar no link do email, vamos te redirecionar automaticamente para {next}.
      </p>
    </div>
  );
}
