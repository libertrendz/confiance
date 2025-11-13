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
    return () => {
      alive = false;
    };
  }, [supa]);

  async function sair() {
    try {
      await supa.auth.signOut();
    } catch {}
    window.location.replace('/login');
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '260px 1fr',
        minHeight: '100vh',
      }}
    >
      {/* SIDEBAR */}
      <aside
        style={{
          position: 'sticky',
          top: 0,
          alignSelf: 'start',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          background: '#071c34',
          color: '#fff',
          padding: 16,
          gap: 8,
        }}
      >
        {/* LOGO + NOME */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 12,
          }}
        >
          <img
            src="/logo-confiance.png"
            alt="CONFIANCE"
            style={{ height: 60, width: 'auto', display: 'block' }}
          />
          <span
            style={{
              fontWeight: 900,
              fontSize: 20,
              letterSpacing: 1,
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            CONFIANCE
          </span>
        </div>

        {/* MENU */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <a href="/adm/dashboard" style={linkStyle}>
            Dashboard
          </a>
          <a href="/adm/utilizadores" style={linkStyle}>
            Utilizadores
          </a>
          <a href="/adm/ponto" style={linkStyle}>
            Ponto (ADM)
          </a>
          <a href="/adm/fornecedores" style={linkStyle}>
            Fornecedores
          </a>
          <a href="/adm/clientes" style={linkStyle}>
            Clientes
          </a>
          <a href="/adm/orcamentos" style={linkStyle}>
            Orçamentos &amp; Contratos
          </a>
          <a href="/adm/financeiro" style={linkStyle}>
            Financeiro
          </a>
          <a href="/adm/ativos" style={linkStyle}>
            Gestão de Ativos
          </a>
          <a href="/adm/configuracoes" style={linkStyle}>
            Configurações
          </a>
        </nav>

        <div style={{ flex: 1 }} />

        {/* RODAPÉ */}
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,.15)',
            paddingTop: 10,
          }}
        >
          <div
            style={{
              fontSize: 12,
              opacity: 0.85,
              marginBottom: 8,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {email ?? '—'}
          </div>
          <button
            onClick={sair}
            style={{
              width: '100%',
              height: 40,
              background: '#F2B705',
              color: '#071c34',
              borderRadius: 10,
              border: 'none',
              fontWeight: 700,
              cursor: 'pointer',
              marginBottom: 6,
            }}
          >
            Sair
          </button>
          <div
            style={{
              fontSize: 10,
              opacity: 0.7,
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              lineHeight: 1.2,
            }}
          >
            Powered by <strong>LIBERTRENDZ®</strong>
          </div>
        </div>
      </aside>

      {/* CONTEÚDO */}
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

const linkStyle: React.CSSProperties = {
  padding: '9px 10px',
  borderRadius: 10,
  color: '#fff',
  textDecoration: 'none',
  opacity: 0.95,
  fontSize: 13,
};
