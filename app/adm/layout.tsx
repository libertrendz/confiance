// app/adm/layout.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supa.auth.getUser();
      if (!alive) return;
      setEmail(data.user?.email ?? null);
    })();
    return () => { alive = false; };
  }, [supa]);

  async function sair() {
    try { await supa.auth.signOut(); } catch {}
    window.location.replace('/login');
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: '100vh' }}>
      {/* SIDEBAR */}
      <aside
        style={{
          position: 'sticky', top: 0, alignSelf: 'start',
          display: 'flex', flexDirection: 'column',
          height: '100vh',
          background: '#0e3258', color: '#fff',
          padding: 16, gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <img src="/logo-confiance.png" alt="CONFIANCE" style={{ height: 42 }} />
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <a href="/adm/dashboard" style={linkStyle}>Dashboard</a>
          <a href="/adm/utilizadores" style={linkStyle}>Utilizadores</a>
          <a href="/adm/ponto" style={linkStyle}>Ponto (ADM)</a>
          <a href="/adm/fornecedores" style={linkStyle}>Fornecedores</a>
          <a href="/adm/clientes" style={linkStyle}>Clientes</a>
          <a href="/adm/orcamentos" style={linkStyle}>Orçamentos & Contratos</a>
          <a href="/adm/financeiro" style={linkStyle}>Financeiro</a>
          <a href="/adm/config" style={linkStyle}>Configurações</a>
        </nav>

        <div style={{ flex: 1 }} />

        {/* rodapé sidebar */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,.15)', paddingTop: 12 }}>
          <div style={{ fontSize: 12, opacity: .8, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {email ?? '—'}
          </div>
          <button
            onClick={sair}
            style={{
              width: '100%',
              height: 40,
              background: '#FFD24D',
              color: '#0e3258',
              borderRadius: 10,
              border: 'none',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Sair
          </button>
        </div>
      </aside>

      {/* CONTEÚDO */}
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

const linkStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 10,
  color: '#fff',
  textDecoration: 'none',
  opacity: .95,
};
