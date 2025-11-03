// app/menu/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

export const dynamic = 'force-dynamic';

export default function MenuPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [email, setEmail] = useState<string>('…');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await supa.auth.getSession();
        const e = data.session?.user?.email || 'Utilizador';
        if (alive) setEmail(e);
      } catch {
        if (alive) setEmail('Utilizador');
      }
    })();
    return () => { alive = false; };
  }, [supa]);

  function sair() {
    window.location.href = '/logout';
  }

  // estilos inline, sem depender de CSS global
  const S = {
    page: {
      minHeight: '100dvh',
      background: '#fafafa',
      color: '#0b1220',
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Inter, sans-serif',
    } as React.CSSProperties,
    topbar: {
      position: 'sticky' as const,
      top: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      padding: '12px 16px',
      background: '#fff',
      borderBottom: '1px solid #e5e7eb',
    },
    brand: { fontSize: 18, fontWeight: 700, whiteSpace: 'nowrap' as const },
    user: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      minWidth: 0,
      flexShrink: 0,
    },
    userEmail: {
      maxWidth: '48vw',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
      color: '#667085',
      fontSize: 14,
    },
    logoutBtn: {
      background: '#111',
      color: '#fff',
      border: 0,
      borderRadius: 10,
      padding: '8px 12px',
      fontSize: 14,
      cursor: 'pointer',
    },
    content: {
      padding: 16,
      display: 'grid',
      gap: 12,
    } as React.CSSProperties,
    // no desktop, 2 colunas
    contentDesktop: {
      maxWidth: 960,
      margin: '0 auto',
      gridTemplateColumns: '1fr 1fr',
    } as React.CSSProperties,
    card: {
      display: 'block',
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      padding: 16,
      textDecoration: 'none',
      color: 'inherit',
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
    },
    cardTitle: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
    cardDesc: { fontSize: 13, color: '#666' },
    actions: { marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' as const },
    btn: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: 40,
      padding: '0 14px',
      borderRadius: 10,
      border: '1px solid transparent',
      cursor: 'pointer',
      textDecoration: 'none',
      fontSize: 14,
    },
    btnPrimary: {
      background: '#0f172a',
      color: '#fff',
    },
    btnGhost: {
      background: 'transparent',
      border: '1px solid #e5e7eb',
      color: '#0b1220',
    },
  };

  // media query manual: aplica 2 colunas se largura ≥ 980px
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 980);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <div style={S.page}>
      {/* HEADER */}
      <header style={S.topbar}>
        <div style={S.brand}>Confiance</div>
        <div style={S.user}>
          <span style={S.userEmail} title={email}>{email}</span>
          <button style={S.logoutBtn} onClick={sair} title="Terminar sessão">Sair</button>
        </div>
      </header>

      {/* CONTEÚDO */}
      <main style={{ ...S.content, ...(isDesktop ? S.contentDesktop : {}) }}>
        {/* Dashboard */}
        <a href="/menu" style={S.card}>
          <div style={S.cardTitle}>Dashboard</div>
          <div style={S.cardDesc}>Indicadores principais do negócio</div>
          <div style={S.actions}>
            <span style={{ ...S.btn, ...S.btnPrimary }}>Abrir</span>
          </div>
        </a>

        {/* Fornecedores */}
        <div style={S.card}>
          <div style={S.cardTitle}>Fornecedores</div>
          <div style={S.cardDesc}>Listagem e gestão de fornecedores</div>
          <div style={S.actions}>
            <a href="/adm/fornecedores" style={{ ...S.btn, ...S.btnPrimary }}>Abrir</a>
            <a href="/adm/fornecedores/novo" style={{ ...S.btn, ...S.btnGhost }}>Novo</a>
            <a href="/adm/fornecedores/importar" style={{ ...S.btn, ...S.btnGhost }}>Importar CSV</a>
          </div>
        </div>

        {/* Ponto ADM */}
        <a href="/adm/ponto" style={S.card}>
          <div style={S.cardTitle}>Ponto (ADM)</div>
          <div style={S.cardDesc}>Relatórios, auditoria e validações</div>
          <div style={S.actions}>
            <span style={{ ...S.btn, ...S.btnPrimary }}>Abrir</span>
          </div>
        </a>

        {/* Marcar Ponto (funcionário) */}
        <a href="/ponto" style={S.card}>
          <div style={S.cardTitle}>Marcar Ponto</div>
          <div style={S.cardDesc}>Registo rápido com geolocalização e foto</div>
          <div style={S.actions}>
            <span style={{ ...S.btn, ...S.btnPrimary }}>Abrir</span>
          </div>
        </a>

        {/* Financeiro */}
        <a href="/financeiro" style={S.card}>
          <div style={S.cardTitle}>Financeiro</div>
          <div style={S.cardDesc}>Lançamentos, faturas, recibos e pagamentos</div>
          <div style={S.actions}>
            <span style={{ ...S.btn, ...S.btnGhost }}>Em construção</span>
          </div>
        </a>

        {/* Orçamentos e Contratos */}
        <a href="/orcamentos" style={S.card}>
          <div style={S.cardTitle}>Orçamentos e Contratos</div>
          <div style={S.cardDesc}>Propostas, numeração automática e templates</div>
          <div style={S.actions}>
            <span style={{ ...S.btn, ...S.btnGhost }}>Em construção</span>
          </div>
        </a>

        {/* Clientes */}
        <a href="/clientes" style={S.card}>
          <div style={S.cardTitle}>Clientes</div>
          <div style={S.cardDesc}>Cadastro e gestão de clientes</div>
          <div style={S.actions}>
            <span style={{ ...S.btn, ...S.btnGhost }}>Em construção</span>
          </div>
        </a>

        {/* Configurações */}
        <div style={{ ...S.card, textAlign: 'center' as const }}>
          <div style={S.cardTitle}>Configurações</div>
          <div style={S.cardDesc}>Perfis, branding e preferências do workspace</div>
          <div style={S.actions}>
            <span style={{ ...S.btn, ...S.btnGhost }}>Em construção</span>
          </div>
        </div>
      </main>
    </div>
  );
}