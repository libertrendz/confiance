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

function clearErrFromUrl() {
  try {
    const u = new URL(window.location.href);
    u.searchParams.delete('err');
    u.searchParams.delete('flow');
    window.history.replaceState({}, '', u.pathname + (u.search ? u.search : '') + u.hash);
  } catch {}
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

  // checa sessão na chegada e redireciona conforme papel
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const { data: sess } = await supa.auth.getSession();
        const uid = sess.session?.user?.id;

        if (!alive) return;

        if (uid) {
          setRedirecting(true);

          // limpa qualquer err antigo antes de mandar embora (evita “mensagem feia”)
          clearErrFromUrl();

          // descobre papel no profiles
          let papel: Papel = 'externo';
          try {
            const { data: prof } = await supa
              .from('profiles')
              .select('papel')
              .eq('user_id', uid)
              .maybeSingle();

            const db = (prof as any)?.papel as Papel | undefined;
            if (db && ['admin', 'gestor', 'externo'].includes(db)) papel = db;
          } catch {}

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
      // ⚠️ Mantém confirm como destino
      // (o Supabase vai redirecionar pra /auth/confirm com token_hash/type)
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
      {/* Logo + nome */}
      <div style={{ display: 'grid', justifyItems: 'center', gap: 10, marginBottom: 18 }}>
        <img
          src="/app-novo.png"
          alt="CONFIANCE"
          style={{ height: 78, width: 'auto', display: 'block' }}
        />
        <div style={{ fontSize: 14, letterSpacing: 2, fontWeight: 900, color: '#6b7280' }}>
          CONFIANCE
        </div>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12, color: '#0e3258' }}>Entrar</h1>

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
                marginTop: 8,
                marginBottom: 12,
                border: '1px solid #d1d5db',
                borderRadius: 14,
                outline: 'none',
              }}
            />

            <button
              type="submit"
              disabled={sending || !email.trim()}
              style={{
                width: '100%',
                padding: 14,
                borderRadius: 14,
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
                opacity: 0.95,
              }}
            />
          </div>
        </>
      )}
    </main>
  );
}