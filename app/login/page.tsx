// app/login/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

export default function LoginPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  // Descobre se já há sessão (desktop vivia “sempre logado”)
  useEffect(() => {
    supa.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
    }).catch(() => setHasSession(false));
  }, [supa]);

  const pedirMagicLink = async (e: React.FormEvent) => {
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
      setMsg('Email enviado. Abra o link no navegador do telemóvel (não no app de email).');
    } catch (e: any) {
      console.error('Magic link error:', e);
      setErr(e?.message ?? 'Falha ao enviar o email. Verifique o endereço e tente novamente.');
    } finally {
      setSending(false);
    }
  };

  const terminarSessao = async () => {
    try {
      await supa.auth.signOut();
      // higiene extra (casos teimosos)
      Object.keys(localStorage)
        .filter((k) => k.startsWith('sb-'))
        .forEach((k) => localStorage.removeItem(k));
      setHasSession(false);
      window.location.replace('/login');
    } catch {
      window.location.replace('/login');
    }
  };

  const irMenu = () => {
    window.location.href = '/menu';
  };

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 420, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Entrar</h1>

      {/* Enquanto detecta sessão, não pisca UI */}
      {hasSession === null ? (
        <p>Carregando…</p>
      ) : hasSession ? (
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
      ) : (
        <>
          <form onSubmit={pedirMagicLink} style={{ marginTop: 8 }}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
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
              {sending ? 'Enviando...' : 'Enviar Magic Link'}
            </button>
          </form>

          {msg && <p style={{ marginTop: 12, color: 'green' }}>{msg}</p>}
          {err && <p style={{ marginTop: 12, color: 'crimson' }}>{err}</p>}

          <p style={{ marginTop: 16, fontSize: 13, color: '#555' }}>
            Dica: ao receber o email, toque em “Abrir no navegador”. Webviews de apps de email usam outro armazenamento e
            o login não “cola” no navegador principal.
          </p>
        </>
      )}
    </main>
  );
}
