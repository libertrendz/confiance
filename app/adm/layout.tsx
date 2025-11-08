'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const AZUL = '#0e3258';
const FUNDO = '#f6f8fb';

export default function AdmLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const item = (href: string, label: string) => {
    const active = pathname.startsWith(href);
    return (
      <Link
        href={href}
        style={{
          display: 'block',
          padding: '10px 12px',
          borderRadius: 10,
          color: active ? '#fff' : '#e3edff',
          background: active ? 'rgba(255,255,255,0.16)' : 'transparent',
          textDecoration: 'none',
          fontWeight: 600,
        }}
      >
        {label}
      </Link>
    );
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: '100vh', background: FUNDO }}>
      <aside style={{ background: AZUL, color: '#fff', padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <img src="/logo-confiance.png" alt="CONFIANCE" style={{ height: 36, width: 'auto' }} />
        </div>
        <nav style={{ display: 'grid', gap: 6 }}>
          {item('/adm/dashboard', 'Dashboard')}
          {item('/adm/utilizadores', 'Utilizadores')}
          {item('/adm/ponto', 'Ponto (ADM)')}
          {item('/adm/fornecedores', 'Fornecedores')}
          {item('/adm/clientes', 'Clientes')}
          {item('/adm/orcamentos', 'Orçamentos & Contratos')}
          {item('/adm/financeiro', 'Financeiro')}
          {item('/adm/ativos', 'Ativos (Frota & Ferramentas)')}
          {item('/adm/configuracoes', 'Configurações')}
        </nav>
      </aside>
      <section style={{ padding: 18 }}>{children}</section>
    </div>
  );
}
