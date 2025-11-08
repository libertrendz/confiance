// app/adm/layout.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  const Item = ({ href, label }: { href: string; label: string }) => {
    const active = path?.startsWith(href);
    return (
      <Link
        href={href}
        style={{
          display: 'block',
          padding: '10px 12px',
          borderRadius: 10,
          textDecoration: 'none',
          fontWeight: 600,
          color: active ? '#fff' : '#0e3258',
          background: active ? '#0e3258' : 'transparent',
          border: active ? 'none' : '1px solid #D7E3FF',
        }}
      >
        {label}
      </Link>
    );
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: '100dvh' }}>
      <aside style={{ padding: 16, borderRight: '1px solid #E9EEF7', background: '#F8FAFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <img src="/logo-confiance.png" alt="CONFIANCE" style={{ height: 34 }} />
          <span style={{ fontWeight: 800, color: '#0e3258' }}>Admin</span>
        </div>
        <nav style={{ display: 'grid', gap: 8 }}>
          <Item href="/adm/dashboard" label="Dashboard" />
          <Item href="/adm/utilizadores" label="Utilizadores" />
          <Item href="/adm/ponto" label="Ponto" />
          <Item href="/adm/fornecedores" label="Fornecedores" />
          <Item href="/adm/clientes" label="Clientes" />
          <Item href="/adm/orcamentos" label="Orçamentos & Contratos" />
          <Item href="/adm/financeiro" label="Financeiro" />
          <Item href="/adm/config" label="Configurações" />
          <Item href="/adm/ativos" label="Ativos (viaturas/ferramentas)" />
        </nav>
      </aside>
      <section style={{ padding: 18 }}>{children}</section>
    </div>
  );
}
