// app/login/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import getBrowserSupabase from '@/lib/supa';

export default function LoginPage() {
  const router = useRouter();
  const qp = useSearchParams();
  const next = qp.get('next') || '/menu';

  const supa = useMemo(() => getBrowserSupabase(), []);
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  // Se já houver sessão, manda pro menu
  useEffect(() => {
    (async () => {
      const { data } = await supa.auth.getUser();
      if (data.user) {
        router.replace(next);
      } else {
        setChecking(false);
      }
    })();
  }, [router, supa, next]);

  async function enviarMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    const origin = window.location.origin;
    const emailRedirectTo = `${origin}/auth/confirm?next=${encodeURIComponent(next)}`;

    const { error } = await supa.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo },
    });

    if (error) setErr(error.message);
    else setMsg('Enviámos um link de acesso para o seu email.');
  }

  if (checking) return <div style={{ padding: 24 }}>A verificar sessão…</div>;

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
      {err && <p style={{ marginTop: 8, color: '#7f1d1d' }}>Erro: {err}</p>}
    </div>
  );
}
