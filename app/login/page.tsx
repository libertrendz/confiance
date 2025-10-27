// app/login/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import getBrowserSupabase from '@/lib/supa';

export default function LoginPage() {
  const router = useRouter();
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supa.auth.getUser();
        setHasSession(!!data.user);
      } catch {
        // ignora
      } finally {
        setChecking(false);
      }
    })();
  }, [supa]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    try {
      const to = `${window.location.origin}/auth/confirm?next=/menu`;
      const { error } = await supa.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: to },
      });
      if (error) throw error;
      setMsg('Enviámos um link de acesso para o seu email.');
    } catch (e: any) {
      setErr(e?.message ?? 'Não foi possível enviar o link.');
    }
  }

  if (checking) {
    return (
      <div style={{ padding: 24, fontFamily: 'system-ui' }}>
        A verificar sessão…
      </div>
    );
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 520, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Entrar</h1>

      {hasSession && (
        <div
          style={{
            border: '1px solid #cbd5e1',
            background: '#f8fafc',
            borderRadius: 12,
            padding: 12,
            marginBottom: 16,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>✅ Sessão ativa encontrada.</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => router.replace('/menu')}
              style={{
                padding: '8px 12px',
                border: '1px solid #111',
                background: '#111',
                color: '#fff',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Ir para o menu
            </button>
            <button
              type="button"
              onClick={async () => {
                await supa.auth.signOut();
                setHasSession(false);
              }}
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                background: '#fff',
                color: '#111',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Terminar sessão
            </button>
          </div>
        </div>
      )}

      <form onSubmit={enviar} style={{ display: 'grid', gap: 10 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            style={{
              display: 'block',
              width: '100%',
              padding: 10,
              border: '1px solid #ddd',
              borderRadius: 8,
            }}
          />
        </label>

        <button
          type="submit"
          style={{
            padding: '10px 14px',
            border: '1px solid #111',
            background: '#111',
            color: '#fff',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Enviar Magic Link
        </button>
      </form>

      {msg && <p style={{ marginTop: 10, color: '#14532d' }}>{msg}</p>}
      {err && <p style={{ marginTop: 10, color: '#7f1d1d' }}>Erro: {err}</p>}
    </div>
  );
}
