// app/adm/layout.tsx
import Link from 'next/link';
import './adm.css';

export const dynamic = 'force-dynamic';

export default function AdmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="adm-shell">
      <aside className="adm-aside">
        <div className="adm-brand">
          <img src="/logo-confiance.png" alt="CONFIANCE" />
        </div>

        <nav className="adm-nav">
          <Section title="Geral">
            <NavItem href="/adm/dashboard" label="Dashboard" />
            <NavItem href="/adm/utilizadores" label="Utilizadores" />
          </Section>

          <Section title="Operação">
            <NavItem href="/adm/ponto" label="Ponto" />
            <NavItem href="/adm/fornecedores" label="Fornecedores" />
            <NavItem href="/adm/clientes" label="Clientes" />
            <NavItem href="/adm/orcamentos" label="Orçamentos & Contratos" />
            <NavItem href="/adm/financeiro" label="Financeiro" />
            <NavItem href="/adm/ativos" label="Ativos" />
            <div className="nav-sub">
              <NavItem href="/adm/ativos/ferramentas" label="• Ferramentas" />
              <NavItem href="/adm/ativos/viaturas"    label="• Viaturas" />
            </div>
          </Section>

          <Section title="Configuração">
            <NavItem href="/adm/configuracoes" label="Configurações" />
          </Section>
        </nav>
      </aside>

      <section className="adm-main">{children}</section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="adm-section">
      <div className="adm-section-title">{title}</div>
      {children}
    </div>
  );
}

function NavItem({ href, label }: { href: string; label: string }) {
  return (
    <Link className="adm-nav-item" href={href}>{label}</Link>
  );
}
