// app/adm/layout.tsx
'use client';

import React, { useEffect, useMemo, useState, type ReactNode, type CSSProperties } from 'react';
import getBrowserSupabase from '@/lib/supa';
import { usePathname } from 'next/navigation';

type Papel = 'admin' | 'gestor' | 'externo';

type NavItem = {
  href: string;
  label: string;
  visible: boolean;
  disabled?: boolean;
  hint?: string; // ex: "Em breve"
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const pathname = usePathname();

  const [email, setEmail] = useState<string | null>(null);
  const [papel, setPapel] = useState<Papel | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoadingUser(true);

        const { data, error } = await supa.auth.getUser();
        if (error) throw error;
        if (!alive) return;

        const user = data.user;
        if (!user) {
          setEmail(null);
          setPapel(null);
          return;
        }

        setEmail(user.email ?? null);

        const meta = (user.user_metadata || {}) as Record<string, any>;
        let effectiveRole: Papel = (meta.app_role as Papel) || (meta.papel as Papel) || 'externo';

        try {
          const { data: prof } = await supa
            .from('profiles')
            .select('papel')
            .eq('user_id', user.id)
            .maybeSingle();

          const dbRole = prof?.papel as Papel | undefined;
          if (dbRole && ['admin', 'gestor', 'externo'].includes(dbRole)) {
            effectiveRole = dbRole;
          }
        } catch (e) {
          console.warn('Falha ao ler papel em profiles:', e);
        }

        if (!alive) return;
        setPapel(effectiveRole);
      } catch (e) {
        console.error('Erro ao carregar utilizador no layout ADM', e);
        if (alive) {
          setEmail(null);
          setPapel(null);
        }
      } finally {
        if (alive) setLoadingUser(false);
      }
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

  if (!loadingUser && papel === 'externo') {
    if (typeof window !== 'undefined') {
      window.location.replace('/menu');
    }
    return null;
  }

  const isAdmin = papel === 'admin';
  const isGestor = papel === 'gestor';

  const navItems: NavItem[] = [
    { href: '/adm/dashboard', label: 'Início', visible: isAdmin || isGestor },
    { href: '/adm/utilizadores', label: 'Utilizadores', visible: isAdmin || isGestor },
    { href: '/adm/colaboradores', label: 'Colaboradores', visible: isAdmin },
    { href: '/adm/roteiros', label: 'Roteiros e Tarefas', visible: isAdmin || isGestor },
    { href: '/adm/ponto', label: 'Registos de Ponto', visible: isAdmin || isGestor },
    { href: '/adm/fornecedores', label: 'Fornecedores', visible: isAdmin || isGestor },
    { href: '/adm/clientes', label: 'Clientes', visible: isAdmin, disabled: true, hint: 'Em breve' },
    { href: '/adm/orcamentos', label: 'Orçamentos e Contratos', visible: isAdmin, disabled: true, hint: 'Em breve' },
    { href: '/adm/financeiro', label: 'Financeiro', visible: isAdmin, disabled: true, hint: 'Em breve' },
    { href: '/adm/ativos', label: 'Gestão de Ativos', visible: isAdmin, disabled: true, hint: 'Em breve' },
    { href: '/adm/configuracoes', label: 'Configurações', visible: isAdmin, disabled: true, hint: 'Em breve' },
  ].filter((i) => i.visible);

  if (loadingUser) {
    return (
      <main style={{ padding: 16, fontFamily: 'system-ui' }}>
        <p style={{ color: '#666' }}>A carregar área administrativa…</p>
      </main>
    );
  }

  return (
    <div style={shellStyle}>
      <aside style={sidebarStyle}>
        {/* Logo */}
        <div style={logoRowStyle}>
          <img src="/app-novo.png" alt="CONFIANCE" style={{ height: 42, width: 'auto', display: 'block' }} />
          <span style={brandStyle}>CONFIANCE</span>
        </div>

        {/* Menu */}
        <nav style={navStyle}>
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/adm/dashboard' && pathname?.startsWith(item.href + '/')) ||
              (item.href === '/adm/dashboard' && pathname === '/adm/dashboard');

            const disabled = item.disabled === true;

            return (
              <a
                key={item.href}
                href={disabled ? undefined : item.href}
                aria-disabled={disabled}
                onClick={(e) => {
                  if (disabled) e.preventDefault();
                }}
                style={{
                  ...linkBaseStyle,
                  ...(isActive ? linkActiveStyle : null),
                  ...(disabled ? linkDisabledStyle : null),
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, width: '100%' }}>
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontWeight: isActive ? 800 : 650,
                      minWidth: 0,
                    }}
                  >
                    {item.label}
                  </span>

                  {item.hint ? <span style={hintStyle}>{item.hint}</span> : null}
                </span>
              </a>
            );
          })}
        </nav>

        <div style={{ flex: 1, minHeight: 8 }} />

        {/* Footer */}
        <div style={footerStyle}>
          <div style={emailStyle} title={email ?? undefined}>
            {email ?? '—'}
          </div>

          <button onClick={sair} style={logoutButtonStyle}>
            Sair
          </button>

          <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 2 }}>
            <img
              src="/powered_by_libertrendzt.png"
              alt="Powered by Libertrendz"
              style={{
                display: 'block',
                width: '100%',
                maxWidth: 176,
                height: 'auto',
                maxHeight: 32,
                objectFit: 'contain',
                opacity: 0.82,
              }}
            />
          </div>
        </div>
      </aside>

      <main style={contentShellStyle}>
        <div style={contentInnerStyle}>{children}</div>
      </main>
    </div>
  );
}

const shellStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '232px minmax(0, 1fr)',
  minHeight: '100vh',
  width: '100%',
  maxWidth: '100vw',
  overflow: 'hidden',
  background: '#f8fafc',
};

const sidebarStyle: CSSProperties = {
  position: 'sticky',
  top: 0,
  alignSelf: 'start',
  display: 'flex',
  flexDirection: 'column',
  height: '100dvh',
  background: '#071c34',
  color: '#fff',
  padding: '10px 12px',
  gap: 8,
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  boxSizing: 'border-box',
};

const contentShellStyle: CSSProperties = {
  minWidth: 0,
  width: '100%',
  maxWidth: '100%',
  overflowX: 'auto',
  overflowY: 'auto',
  background: '#f8fafc',
};

const contentInnerStyle: CSSProperties = {
  width: '100%',
  minWidth: 0,
  padding: '18px 20px',
  boxSizing: 'border-box',
};

const logoRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  paddingBottom: 10,
  marginBottom: 4,
  borderBottom: '1px solid rgba(255,255,255,.12)',
};

const brandStyle: CSSProperties = {
  fontWeight: 900,
  fontSize: 16,
  letterSpacing: 1,
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  lineHeight: 1,
};

const navStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
};

const linkBaseStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  minHeight: 34,
  padding: '7px 10px',
  borderRadius: 9,
  color: '#fff',
  textDecoration: 'none',
  opacity: 0.9,
  fontSize: 12.5,
  lineHeight: 1.2,
  border: '1px solid transparent',
  background: 'transparent',
  boxSizing: 'border-box',
};

const linkActiveStyle: CSSProperties = {
  background: 'rgba(255,255,255,0.095)',
  border: '1px solid rgba(255,255,255,0.14)',
  opacity: 1,
};

const linkDisabledStyle: CSSProperties = {
  opacity: 0.42,
  cursor: 'not-allowed',
};

const hintStyle: CSSProperties = {
  marginLeft: 'auto',
  fontSize: 10.5,
  opacity: 0.62,
  fontWeight: 650,
  whiteSpace: 'nowrap',
};

const footerStyle: CSSProperties = {
  borderTop: '1px solid rgba(255,255,255,.14)',
  paddingTop: 8,
};

const emailStyle: CSSProperties = {
  fontSize: 11.5,
  opacity: 0.82,
  marginBottom: 7,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const logoutButtonStyle: CSSProperties = {
  width: '100%',
  height: 34,
  background: '#F2B705',
  color: '#071c34',
  borderRadius: 9,
  border: 'none',
  fontWeight: 850,
  cursor: 'pointer',
  marginBottom: 8,
};
