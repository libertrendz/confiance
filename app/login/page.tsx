// app/login/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

export const dynamic = 'force-dynamic';

function getErrFromUrl() {
  try {
    const u = new URL(window.location.href);
    return u.searchParams.get('err');
  } catch {
    return null;
  }
}

export default function LoginPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await supa.auth.getSession();
        const valid = !!(data.session && data.session.user?.id);

        if (!alive) return;

        if (valid) {
          setRedirecting(true);
          window.location.replace('/menu');
          return;
        }
      } catch {
        // ignora
      } finally {
        if (!alive) return;
        setChecked(true);

        // só lê err da URL se NÃO está redirecionando
        const urlErr = typeof window !== 'undefined' ? getErrFromUrl() : null;
        if (urlErr) setErr(urlErr);
      }
    })();

    return () => {
      alive = false;
    };
  }, [supa]);

  async function pedirMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setMsg(null);
    setErr(null);

    try {
      // padrão único do projeto: /auth/confirm
      const redirect = `${window.location.origin}/auth/confirm?next=/menu`;

      const { error } = await supa.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirect },
      });

      if (error) throw error;

      setMsg('Email enviado. Se abrir dentro do app de email, use “Abrir no navegador”.');
    } catch (e: any) {
      setErr(e?.message ?? 'Falha ao enviar o email. Tente novamente.');
    } finally {
      setSending(false);
    }
  }

  if (redirecting) {
    return (
      <main style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 420, margin: '0 auto' }}>
        <p style={{ color: '#666' }}>Entrando…</p>
      </main>
    );
  }

  return (
    <main
      style={{
        padding: 24,
        fontFamily: 'system-ui',
        maxWidth: 420,
        margin: '0 auto',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 14,
      }}
    >
      {/* Logo Confiance */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
        <img
          src="/app-novo.png"
          alt="CONFIANCE"
          style={{
            height: 64,
            width: 'auto',
            display: 'block',
          }}
        />
      </div>
<div style={{ textAlign: 'center', marginTop: 2 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, color: '#6b7280' }}>
          CONFIANCE
        </div>
        <div style={{ fontSize: 18, fontWeight: 900, color: '#0e3258' }}>Entrar</div>
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, textAlign: 'center', color: '#0e3258' }}>
        Entrar
      </h1>

      {!checked && <p style={{ color: '#666', textAlign: 'center', margin: 0 }}>A verificar sessão…</p>}

      {checked && (
        <>
          <form onSubmit={pedirMagicLink} style={{ marginTop: 6 }}>
            <label htmlFor="email" style={{ fontSize: 13, fontWeight: 700, color: '#0e3258' }}>
              Email
            </label>

            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                marginTop: 6,
                marginBottom: 12,
                border: '1px solid var(--border)',
                borderRadius: 10,
                background: '#fff',
              }}
            />

            <button
              type="submit"
              disabled={sending || !email.trim()}
              className="btn btn-primary"
              style={{
                width: '100%',
                height: 44,
                borderRadius: 10,
                opacity: sending || !email.trim() ? 0.6 : 1,
              }}
            >
              {sending ? 'Enviando…' : 'Enviar Magic Link'}
            </button>
          </form>

          {msg && <p style={{ marginTop: 12, color: 'green' }}>{msg}</p>}

          {/* só mostra erro se NÃO estiver redirecionando */}
          {err && <p style={{ marginTop: 12, color: 'crimson' }}>{err}</p>}

          {/* Powered by */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
            <img
              src="/powered_by_libertrendz.png"
              alt="Powered by Libertrendz"
              style={{
                width: 'min(260px, 70vw)',
                height: 'auto',
                display: 'block',
                opacity: 0.9,
              }}
            />
          </div>
        </>
      )}
    </main>
  );
}
