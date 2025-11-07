// app/adm/layout.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import getBrowserSupabase from '@/lib/supa';

const AZUL = '#0e3258';

const NAV = [
  { href: '/adm/dashboard', label: 'Dashboard' },
  { href: '/adm/users',     label: 'Utilizadores' },
  { href: '/adm/ponto',     label: 'Ponto (ADM)' },
  { href: '/adm/fornecedores', label: 'Fornecedores' },
  { href: '/adm/clientes',  label: 'Clientes' },
  { href: '/adm/orcamentos',label: 'Orçamentos & Contratos' },
  { href: '/adm/financeiro',label: 'Financeiro' },
  { href: '/adm/config',    label: 'Configurações' },
];

export default function AdmLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const supa = useMemo(() => getBrowserSupabase(), []);

  async function sair() {
    try { await supa.auth.signOut(); } catch {}
    window.location.replace('/login');
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: '100vh', background: '#f6f8fb' }}>
      {/* Sidebar */}
      <aside style={{ background: AZUL, color: '#fff', padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <img src="/logo-confiance.png" alt="CONFIANCE" style={{ height: 36, width: 'auto' }} />
          <strong style={{ letterSpacing: 0.3 }}>CONFIANCE</strong>
        </div>
        <nav style={{ display: 'grid', gap: 6 }}>
          {NAV.map(i => {
            const active = pathname.startsWith(i.href);
            return (
              <Link key={i.href} href={i.href}
                style={{
                  textDecoration: 'none',
                  color: active ? AZUL : '#e8eef6',
                  background: active ? '#ffffff' : 'transparent',
                  borderRadius: 10,
                  padding: '10px 12px',
                  border: active ? '1px solid #dfe7f4' : '1px solid transparent'
                }}>
                {i.label}
              </Link>
            );
          })}
        </nav>
        <button onClick={sair}
          style={{ marginTop: 16, width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #dfe7f4', background: '#fff', color: AZUL, cursor: 'pointer' }}>
          Sair
        </button>
      </aside>

      {/* Conteúdo */}
      <main style={{ padding: 16, maxWidth: 1200, width: '100%', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  );
}
