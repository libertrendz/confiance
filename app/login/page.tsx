// app/login/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sessionActive, setSessionActive] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supa.auth.getSession();
      setSessionActive(!!data.session);
    })();
  }, [supa]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null); setErr(null);
    try {
      // IMPORTANTE: redirecionar para /auth/confirm (sem next)
      const emailRedirectTo = `${window.location.origin}/auth/confirm`;
      const { error } = await supa.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo },
      });
      if (error) throw error;
      setMsg('Enviámos um link de acesso para o seu e-mail.');
    } catch (e: any) {
      setErr(e?.message || 'Erro ao enviar o link.');
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 520, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Entrar</h1>

      {sessionActive && (
        <div style={{ marginBottom: 12, padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
          <b>Sessão ativa encontrada.</b>
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <a href="/menu" style={{ textDecoration: 'none' }}>
              <button
                type="button"
                style={{ padding: '8px 12px', border: '1px solid #111', background: '#111', color: '#fff', borderRadius: 8 }}
              >
                Ir para o menu
              </button>
            </a>
            <button
              type="button"
              onClick={async () => {
                await supa.auth.signOut();
                setSessionActive(false);
              }}
              style={{ padding: '8px 12px', border: '1px solid #ddd', background: '#fff', borderRadius: 8 }}
            >
              Terminar sessão
            </button>
          </div>
        </div>
      )}

      <form onSubmit={enviar} style={{ display: 'grid', gap: 8 }}>
        <label>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ display: 'block', width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 8 }}
          />
        </label>
        <button
          type="submit"
          style={{ padding: '10px 14px', border: '1px solid #111', background: '#111', color: '#fff', borderRadius: 8 }}
        >
          Enviar Magic Link
        </button>
      </form>

      {msg && <p style={{ marginTop: 8, color: '#14532d' }}>{msg}</p>}
      {err && <p style={{ marginTop: 8, color: '#7f1d1d' }}>{err}</p>}
    </div>
  );
}
