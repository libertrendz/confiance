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

export default function LoginPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // checa sessão na chegada e redireciona conforme papel
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const { data } = await supa.auth.getSession();
        const valid = !!(data.session && data.session.user?.id);
        if (!alive) return;

        if (valid) {
          setRedirecting(true);

          // tenta decidir destino por papel (profiles tem prioridade)
          let papel: Papel | null = null;

          try {
            const { data: u } = await supa.auth.getUser();
            const uid = u.user?.id;

            if (uid) {
              const { data: prof } = await supa
                .from('profiles')
                .select('papel')
                .eq('user_id', uid)
                .maybeSingle();

              const p = (prof as any)?.papel as Papel | undefined;
              if (p && ['admin', 'gestor', 'externo'].includes(p)) papel = p;
            }

            if (!papel) {
              const meta = ((u.user?.user_metadata || {}) as any) || {};
              const p = (meta.app_role || meta.papel) as Papel | undefined;
              if (p && ['admin', 'gestor', 'externo'].includes(p)) papel = p;
            }
          } catch {
            // ignora e cai no padrão
          }

          const dest = papel === 'admin' || papel === 'gestor' ? '/adm/dashboard' : '/menu';
          window.location.replace(dest);
          return;
        }
      } catch {
        // ignora
      } finally {
        if (alive) {
          setChecked(true);

          // Se quiser continuar mostrando erro quando existir ?err=..., mantém.
          // (Mas agora o /auth/confirm não manda mais err técnico, então some o “flash feio”.)
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
      // ✅ IMPORTANTE: enviar para /auth/confirm (não /auth/callback)
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
    <main style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 420, margin: '0 auto' }}>
      {/* Logo + CONFIANCE (mantém UI) */}
      <div style={{ display: 'grid', justifyItems: 'center', marginBottom: 16, marginTop: 8 }}>
        <img
          src="/app-novo.png"
          alt="CONFIANCE"
          style={{ height: 86, width: 'auto', display: 'block' }}
        />
        <div
          style={{
            marginTop: 8,
            fontWeight: 900,
            letterSpacing: 2,
            color: '#6b7280',
            textTransform: 'uppercase',
            fontSize: 16,
          }}
        >
          CONFIANCE
        </div>
      </div>

      <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 12, color: '#0e3258' }}>Entrar</h1>

      {!checked && <p style={{ color: '#666' }}>A verificar sessão…</p>}

      {checked && (
        <>
          <form onSubmit={pedirMagicLink} style={{ marginTop: 8 }}>
            <label htmlFor="email" style={{ fontWeight: 700, color: '#0e3258' }}>
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
                padding: 14,
                marginTop: 10,
                marginBottom: 12,
                border: '1px solid #d1d5db',
                borderRadius: 16,
                outline: 'none',
              }}
            />

            <button
              type="submit"
              disabled={sending || !email.trim()}
              style={{
                width: '100%',
                padding: 14,
                borderRadius: 16,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 900,
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
              src="/powered-by-libertrendz.png"
              alt="Powered by Libertrendz"
              style={{
                width: 'min(320px, 80vw)',
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