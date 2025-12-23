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

  // checa sessão na chegada e redireciona direto se existir
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setErr(null);
        setMsg(null);

        const { data } = await supa.auth.getSession();
        const valid = !!(data.session && data.session.user?.id);

        if (!alive) return;

        if (valid) {
          setRedirecting(true);

          // tenta decidir destino pelo papel (meta -> profiles)
          let papel: Papel = 'externo';

          try {
            const { data: ud } = await supa.auth.getUser();
            const user = ud.user;

            const meta = (user?.user_metadata || {}) as Record<string, any>;
            const metaRole = (meta.app_role as Papel) || (meta.papel as Papel);
            if (metaRole && ['admin', 'gestor', 'externo'].includes(metaRole)) {
              papel = metaRole;
            }

            // confirma pelo DB (se disponível)
            if (user?.id) {
              const { data: prof } = await supa
                .from('profiles')
                .select('papel')
                .eq('user_id', user.id)
                .maybeSingle();

              const dbRole = (prof as any)?.papel as Papel | undefined;
              if (dbRole && ['admin', 'gestor', 'externo'].includes(dbRole)) {
                papel = dbRole;
              }
            }
          } catch {
            // se falhar, segue com o papel inferido (externo)
          }

          const dest = papel === 'admin' || papel === 'gestor' ? '/adm/dashboard' : '/menu';
          window.location.replace(dest);
          return;
        }
      } catch {
        // ignora
      } finally {
        if (!alive) return;
        setChecked(true);

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
      // mantemos confirm como destino do email
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
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Entrando…</h1>
        <p>Redirecionando…</p>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: 24,
        fontFamily: 'system-ui',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo + CONFIANCE */}
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <img
            src="/app-novo.png"
            alt="CONFIANCE"
            style={{
              height: 56,
              width: 'auto',
              display: 'block',
              margin: '0 auto 8px auto',
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

        <div
          className="card"
          style={{
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: 16,
            background: '#fff',
          }}
        >
          <h1 style={{ fontSize: 18, fontWeight: 900, margin: 0, color: '#0e3258' }}>Entrar</h1>

          {!checked && <p style={{ color: '#666', marginTop: 10 }}>A verificar sessão…</p>}

          {checked && (
            <>
              <form onSubmit={pedirMagicLink} style={{ marginTop: 12 }}>
                <label htmlFor="email" className="muted">
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
                  }}
                />

                <button
                  type="submit"
                  disabled={sending || !email.trim()}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    height: 42,
                    borderRadius: 10,
                    opacity: sending || !email.trim() ? 0.65 : 1,
                  }}
                >
                  {sending ? 'Enviando…' : 'Enviar Magic Link'}
                </button>
              </form>

              {/* Powered (abaixo do email/form) */}
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
                <img
                  src="/powered_by_libertrendz.png"
                  alt="Powered by Libertrendz"
                  style={{
                    width: '100%',
                    maxWidth: 260,
                    height: 'auto',
                    display: 'block',
                    opacity: 0.9,
                  }}
                />
              </div>

              {msg && <p style={{ marginTop: 12, color: 'green' }}>{msg}</p>}
              {err && <p style={{ marginTop: 12, color: 'crimson' }}>{err}</p>}
            </>
          )}
        </div>
      </div>
    </main>
  );
}