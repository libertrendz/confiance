// app/login/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

export const dynamic = 'force-dynamic';

type Papel = 'admin' | 'gestor' | 'externo';

function getErrFromUrl() {
  try {
    const u = new URL(window.location.href);
    return u.searchParams.get('err');
  } catch {
    return null;
  }
}

function normalizeRole(v: any): Papel {
  const s = String(v || '').toLowerCase().trim();
  if (s === 'admin' || s === 'gestor' || s === 'externo') return s as Papel;
  return 'externo';
}

export default function LoginPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  async function redirectByRole(userId: string) {
    // prioridade: profiles.papel; fallback: user_metadata.app_role
    let role: Papel = 'externo';

    try {
      const { data: prof } = await supa
        .from('profiles')
        .select('papel')
        .eq('user_id', userId)
        .maybeSingle();

      if (prof?.papel) role = normalizeRole(prof.papel);
    } catch {
      // ignora, cai no fallback
    }

    if (role === 'admin' || role === 'gestor') {
      window.location.replace('/adm/dashboard');
      return;
    }
    window.location.replace('/menu');
  }

  // checa sessão na chegada e redireciona direto se existir
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const { data } = await supa.auth.getSession();
        const uid = data.session?.user?.id || null;

        if (!alive) return;

        if (uid) {
          setRedirecting(true);
          await redirectByRole(uid);
          return;
        }
      } catch {
        // ignora
      } finally {
        if (!alive) return;
        setChecked(true);

        // só mostra erro se NÃO estiver redirecionando
        const urlErr = typeof window !== 'undefined' ? getErrFromUrl() : null;
        if (urlErr) setErr(urlErr);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supa]);

  async function pedirMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setMsg(null);
    setErr(null);

    try {
      // Mantém confirm como handler único
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
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12, color: '#0e3258' }}>Entrando…</h1>
        <p style={{ color: '#49546A' }}>Redirecionando…</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 420, margin: '0 auto' }}>
      {/* Logo + CONFIANCE */}
      <div style={{ display: 'grid', justifyItems: 'center', marginBottom: 14 }}>
        <img
          src="/app-novo.png"
          alt="CONFIANCE"
          style={{
            height: 54,
            width: 'auto',
            display: 'block',
            marginBottom: 6,
          }}
        />
        <div
          style={{
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: 1,
            color: '#6b7280',
            fontWeight: 800,
          }}
        >
          CONFIANCE
        </div>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12, color: '#0e3258' }}>Entrar</h1>

      {!checked && <p style={{ color: '#666' }}>A verificar sessão…</p>}

      {checked && (
        <>
          <form onSubmit={pedirMagicLink} style={{ marginTop: 8 }}>
            <label htmlFor="email" style={{ fontSize: 13, color: '#49546A', fontWeight: 700 }}>
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
                border: '1px solid var(--border, #d1d5db)',
                borderRadius: 10,
              }}
            />

            <button
              type="submit"
              disabled={sending || !email.trim()}
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 800,
                background: '#0e3258',
                color: '#fff',
                opacity: sending || !email.trim() ? 0.6 : 1,
              }}
            >
              {sending ? 'Enviando…' : 'Enviar Magic Link'}
            </button>
          </form>

          {msg && <p style={{ marginTop: 12, color: 'green' }}>{msg}</p>}
          {err && <p style={{ marginTop: 12, color: 'crimson' }}>{err}</p>}

          {/* Powered by (NÃO some) */}
          <div style={{ display: 'grid', justifyItems: 'center', marginTop: 18 }}>
            <img
              src="/powered_by_libertrendz.png"
              alt="Powered by Libertrendz"
              style={{
                width: 'min(320px, 78vw)',
                height: 'auto',
                display: 'block',
                opacity: 0.92,
              }}
            />
          </div>
        </>
      )}
    </main>
  );
}