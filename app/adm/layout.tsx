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
    {
      href: '/adm/dashboard',
      label: 'Dashboard',
      visible: isAdmin || isGestor,
    },
    {
      href: '/adm/utilizadores',
      label: 'Utilizadores',
      visible: isAdmin || isGestor,
    },
    {
      href: '/adm/colaboradores',
      label: 'Colaboradores',
      visible: isAdmin,
      disabled: true,
      hint: 'Em breve',
    },
    {
      href: '/adm/roteiros',
      label: 'Roteiros e Tarefas',
      visible: isAdmin || isGestor,
    },
    {
      href: '/adm/ponto',
      label: 'Registos de Ponto',
      visible: isAdmin || isGestor,
    },
    {
      href: '/adm/clientes',
      label: 'Clientes',
      visible: isAdmin,
      disabled: true,
      hint: 'Em breve',
    },
    {
      href: '/adm/orcamentos',
      label: 'Orçamentos e Contratos',
      visible: isAdmin,
      disabled: true,
      hint: 'Em breve',
    },
    {
      href: '/adm/fornecedores',
      label: 'Fornecedores',
      visible: isAdmin || isGestor,
    },
    {
      href: '/adm/financeiro',
      label: 'Financeiro',
      visible: isAdmin,
      disabled: true,
      hint: 'Em breve',
    },
    {
      href: '/adm/ativos',
      label: 'Gestão de Ativos',
      visible: isAdmin,
      disabled: true,
      hint: 'Em breve',
    },
    {
      href: '/adm/configuracoes',
      label: 'Configurações',
      visible: isAdmin,
      disabled: true,
      hint: 'Em breve',
    },
  ].filter((i) => i.visible);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '260px 1fr',
        minHeight: '100vh',
      }}
    >
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
          gap: 10,
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            paddingBottom: 12,
            marginBottom: 6,
            borderBottom: '1px solid rgba(255,255,255,.12)',
          }}
        >
          <img
            src="/app-novo.png"
            alt="CONFIANCE"
            style={{ height: 56, width: 'auto', display: 'block' }}
          />
          <span
            style={{
              fontWeight: 900,
              fontSize: 18,
              letterSpacing: 1,
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              lineHeight: 1,
            }}
          >
            CONFIANCE
          </span>
        </div>

        {/* Menu (Plano A: lista única, limpa) */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontWeight: isActive ? 800 : 600,
                    }}
                  >
                    {item.label}
                  </span>

                  {item.hint ? (
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: 11,
                        opacity: 0.65,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.hint}
                    </span>
                  ) : null}
                </span>
              </a>
            );
          })}
        </nav>

        <div style={{ flex: 1 }} />

        {/* Footer */}
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
            title={email ?? undefined}
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
              fontWeight: 800,
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

      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

const linkBaseStyle: CSSProperties = {
  padding: '10px 10px',
  borderRadius: 10,
  color: '#fff',
  textDecoration: 'none',
  opacity: 0.92,
  fontSize: 13,
  border: '1px solid transparent',
  background: 'transparent',
};

const linkActiveStyle: CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.12)',
  opacity: 1,
};

const linkDisabledStyle: CSSProperties = {
  opacity: 0.45,
  cursor: 'not-allowed',
};
