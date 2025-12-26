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

function shouldHideErr(e: string) {
  const msg = (e || '').toLowerCase();
  return (
    msg.includes('missing_code_or_token') ||
    msg.includes('both auth code and code verifier') ||
    msg.includes('code verifier') ||
    msg.includes('invalid request')
  );
}

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
        const { data } = await supa.auth.getSession();
        const valid = !!(data.session && data.session.user?.id);
        if (!alive) return;

        if (valid) {
          setRedirecting(true);

          // tenta mandar admin/gestor pro dashboard (sem mexer em AuthGate)
          try {
            const uid = data.session!.user.id;
            const { data: prof } = await supa
              .from('profiles')
              .select('papel')
              .eq('user_id', uid)
              .maybeSingle();

            const papel = (prof as any)?.papel as string | undefined;
            if (papel === 'admin' || papel === 'gestor') {
              window.location.replace('/adm/dashboard');
              return;
            }
          } catch {}

          window.location.replace('/menu');
          return;
        }
      } catch {
        // ignora
      } finally {
        if (alive) {
          setChecked(true);
          const urlErr = typeof window !== 'undefined' ? getErrFromUrl() : null;
          if (urlErr && !shouldHideErr(urlErr)) setErr(urlErr);
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
      // ✅ aponta para /auth/confirm (PAGE)
      const redirect = `${window.location.origin}/auth/confirm?next=/menu`;

      const { error } = await supa.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirect },
      });

      if (error) throw error;
      setMsg('E-mail para validação de acesso enviado. Ao abrir, clique no link "Entrar Agora".');
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
      {/* ✅ Logo + texto CONFIANCE (não mexe no resto) */}
      <div style={{ display: 'grid', justifyItems: 'center', marginBottom: 14 }}>
        <img
          src="/app-novo.png"
          alt="CONFIANCE"
          style={{ height: 64, width: 'auto', display: 'block' }}
        />
        <div
          style={{
            marginTop: 6,
            fontWeight: 900,
            letterSpacing: 1,
            color: '#0e3258',
            textTransform: 'uppercase',
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          CONFIANCE
        </div>
      </div>

      {/* ✅ mantém título, só ajusta tamanho pra 20 como você pediu */}
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Entrar</h1>

      {!checked && <p style={{ color: '#666' }}>A verificar sessão…</p>}

      {checked && (
        <>
          <form onSubmit={pedirMagicLink} style={{ marginTop: 8 }}>
            <label htmlFor="email">Email</label>
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
                border: '1px solid #ccc',
                borderRadius: 8,
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
                opacity: sending || !email.trim() ? 0.6 : 1,
              }}
            >
              {sending ? 'Enviando…' : 'Enviar Magic Link'}
            </button>
          </form>

          {msg && <p style={{ marginTop: 12, color: 'green' }}>{msg}</p>}
          {err && <p style={{ marginTop: 12, color: 'crimson' }}>{err}</p>}

          {/* ✅ Powered by (não some) */}
          <div style={{ display: 'grid', justifyItems: 'center', marginTop: 18 }}>
            <img
              src="/powered-by-libertrendz.png"
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
