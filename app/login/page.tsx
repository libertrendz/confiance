// app/login/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState<boolean>(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await supa.auth.getSession();
        if (!alive) return;
        setHasSession(!!data.session);
      } catch {
        if (!alive) return;
        setHasSession(false);
      } finally {
        if (alive) setChecked(true);
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
      // ESSA É A PARTE DO ITEM 5: redireciona para /auth/confirm (server) que troca o code por cookies
      const redirect = `${window.location.origin}/auth/confirm?next=/menu`;
      const { error } = await supa.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirect },
      });
      if (error) throw error;
      setMsg('Email enviado. Ao abrir, se houver opção, toque em “Abrir no navegador”.');
    } catch (e: any) {
      setErr(e?.message ?? 'Falha ao enviar o email. Tente novamente.');
    } finally {
      setSending(false);
    }
  }

  function irMenu() {
    window.location.href = '/menu';
  }

  function terminarSessao() {
    // agora o logout real está no servidor (limpa cookies http-only)
    window.location.href = '/auth/signout';
  }

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 420, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Entrar</h1>

      {!checked && <p style={{ color: '#666' }}>A verificar sessão…</p>}

      {checked && hasSession && (
        <div
          style={{
            border: '1px solid #e5e5e5',
            borderRadius: 10,
            padding: 12,
            marginBottom: 16,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>Sessão ativa encontrada.</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={irMenu}>Ir para o menu</button>
            <button type="button" onClick={terminarSessao}>Terminar sessão</button>
          </div>
        </div>
      )}

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

      <p style={{ marginTop: 16, fontSize: 13, color: '#555' }}>
        Dica: se o app de e-mail abrir um webview e não colar a sessão no navegador principal, toque em “Abrir no
        navegador”.
      </p>
    </main>
  );
}
