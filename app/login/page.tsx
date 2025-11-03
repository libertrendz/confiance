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
    const check = async () => {
      try {
        const { data } = await supa.auth.getSession();

        // algumas webviews bugam e devolvem session vazia como "truthy"
        const valid = !!(data.session && data.session.user?.id);
        if (!alive) return;
        setHasSession(valid);
      } catch {
        if (!alive) return;
        setHasSession(false);
      } finally {
        if (alive) setChecked(true);
      }
    };

    // checa sessão e força fallback em 2s
    const timer = setTimeout(() => {
      if (!checked) setChecked(true);
    }, 2000);

    check();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [supa]);

  async function pedirMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setMsg(null);
    setErr(null);
    try {
      const redirect = `${window.location.origin}/auth/confirm?next=/menu`;
      const { error } = await supa.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirect },
      });
      if (error) throw error;
      setMsg('Email enviado. Se abrir em app de email, use "Abrir no navegador".');
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
    window.location.href = '/auth/signout';
  }

  return (
    <main
      style={{
        padding: 24,
        fontFamily: 'system-ui',
        maxWidth: 420,
        margin: '0 auto',
      }}
    >
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
            <button type="button" onClick={irMenu}>
              Ir para o menu
            </button>
            <button type="button" onClick={terminarSessao}>
              Terminar sessão
            </button>
          </div>
        </div>
      )}

      {checked && !hasSession && (
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
      )}

      {msg && <p style={{ marginTop: 12, color: 'green' }}>{msg}</p>}
      {err && <p style={{ marginTop: 12, color: 'crimson' }}>{err}</p>}
    </main>
  );
}
