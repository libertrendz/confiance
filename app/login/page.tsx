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

type Papel = 'admin' | 'gestor' | 'externo';

export default function LoginPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);

  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // Checa sessão e redireciona:
  // - externo -> /menu
  // - admin/gestor -> /adm/dashboard
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const { data } = await supa.auth.getSession();
        const session = data.session;
        const user = session?.user;

        if (!alive) return;

        if (user?.id) {
          setRedirecting(true);

          // 1) tenta role pelo metadata
          const meta = (user.user_metadata || {}) as Record<string, any>;
          let papel: Papel = (meta.app_role as Papel) || (meta.papel as Papel) || 'externo';

          // 2) se possível, confirma role no profiles (fonte mais confiável)
          try {
            const { data: prof } = await supa
              .from('profiles')
              .select('papel')
              .eq('user_id', user.id)
              .maybeSingle();

            const dbRole = (prof?.papel as Papel | undefined) || null;
            if (dbRole && ['admin', 'gestor', 'externo'].includes(dbRole)) {
              papel = dbRole;
            }
          } catch {
            // ignora — segue com metadata
          }

          window.location.replace(papel === 'admin' || papel === 'gestor' ? '/adm/dashboard' : '/menu');
          return;
        }
      } catch {
        // ignora
      } finally {
        if (alive) {
          setChecked(true);
          const urlErr = typeof window !== 'undefined' ? getErrFromUrl() : null;
          if (urlErr) setErr(urlErr);
        }
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
      // Fluxo simples e estável: volta SEMPRE para /auth/confirm
      // (lá você trata token_hash/type e redireciona pro next)
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
    <main style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 420, margin: '0 auto' }}>
      {/* Logo + CONFIANCE */}
      <div style={{ display: 'grid', justifyItems: 'center', gap: 10, marginBottom: 14 }}>
        <img
          src="/app-novo.png"
          alt="CONFIANCE"
          style={{ height: 72, width: 'auto', display: 'block' }}
        />
        <div
          style={{
            fontWeight: 900,
            letterSpacing: 1,
            color: '#6b7280',
            textTransform: 'uppercase',
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
            <label htmlFor="email" style={{ fontWeight: 700, color: '#374151' }}>
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
                padding: 12,
                marginTop: 8,
                marginBottom: 12,
                border: '1px solid #d1d5db',
                borderRadius: 12,
                outline: 'none',
              }}
            />

            <button
              type="submit"
              disabled={sending || !email.trim()}
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 12,
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

          {/* Powered by (não some) */}
          <div style={{ display: 'grid', justifyItems: 'center', marginTop: 18 }}>
            <img
              src="/powered-by-libertrendz.png"
              alt="Powered by Libertrendz"
              style={{
                width: 'min(320px, 78vw)',
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