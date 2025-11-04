// components/Header.tsx
'use client';

import { useMemo } from 'react';
import getBrowserSupabase from '@/lib/supa';

type HeaderProps = { email?: string | null };

export default function Header({ email }: HeaderProps) {
  const supa = useMemo(() => getBrowserSupabase(), []);

  async function terminarSessao() {
    try {
      await supa.auth.signOut();     // encerra sessão local
    } catch {
      // noop
    } finally {
      window.location.replace('/login');
    }
  }

  return (
    <header className="topbar">
      <div className="brand">
        <img src="/logo-confiance.png" alt="CONFIANCE" className="brand-logo" />
      </div>
      <div className="user">
        <span className="user-email">{email ?? '—'}</span>
        <button type="button" className="btn btn-ghost" onClick={terminarSessao}>
          Sair
        </button>
      </div>
    </header>
  );
}
