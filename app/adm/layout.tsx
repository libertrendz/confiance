// app/adm/layout.tsx
'use client';

import React, { useEffect, useMemo, useState, type ReactNode, type CSSProperties } from 'react';
import { usePathname } from 'next/navigation';
import getBrowserSupabase from '@/lib/supa';

type Papel = 'admin' | 'gestor' | 'externo';

type NavItem = {
  label: string;
  href: string;
  show: (ctx: { isAdmin: boolean; isGestor: boolean }) => boolean;
  badge?: 'EM BREVE';
};

type NavSection = {
  title: string;
  items: NavItem[];
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

  const ctx = { isAdmin, isGestor };

  const sections: NavSection[] = [
    {
      title: 'Operação',
      items: [
        {
          label: 'Dashboard',
          href: '/adm/dashboard',
          show: ({ isAdmin, isGestor }) => isAdmin || isGestor,
        },
        {
          label: 'Utilizadores',
          href: '/adm/utilizadores',
          show: ({ isAdmin, isGestor }) => isAdmin || isGestor,
        },
        {
          label: 'Colaboradores',
          href: '/adm/colaboradores',
          show: ({ isAdmin }) => isAdmin,
          badge: 'EM BREVE',
        },
        {
          label: 'Roteiros e Tarefas',
          href: '/adm/roteiros',
          show: ({ isAdmin, isGestor }) => isAdmin || isGestor,
        },
        {
          label: 'Registos de Ponto',
          href: '/adm/ponto',
          show: ({ isAdmin, isGestor }) => isAdmin || isGestor,
        },
        {
          label: 'Fornecedores',
          href: '/adm/fornecedores',
          show: ({ isAdmin, isGestor }) => isAdmin || isGestor,
        },
      ],
    },
    {
      title: 'Comercial',
      items: [
        {
          label: 'Clientes',
          href: '/adm/clientes',
          show: ({ isAdmin }) => isAdmin,
          badge: 'EM BREVE',
        },
        {
          label: 'Orçamentos e Contratos',
          href: '/adm/orcamentos',
          show: ({ isAdmin }) => isAdmin,
          badge: 'EM BREVE',
        },
      ],
    },
    {
      title: 'Gestão',
      items: [
        {
          label: 'Financeiro',
          href: '/adm/financeiro',
          show: ({ isAdmin }) => isAdmin,
          badge: 'EM BREVE',
        },
        {
          label: 'Gestão de Ativos',
          href: '/adm/ativos',
          show: ({ isAdmin }) => isAdmin,
          badge: 'EM BREVE',
        },
      ],
    },
    {
      title: 'Sistema',
      items: [
        {
          label: 'Configurações',
          href: '/adm/configuracoes',
          show: ({ isAdmin }) => isAdmin,
          badge: 'EM BREVE',
        },
      ],
    },
  ];

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (pathname === href) return true;
    // mantém ativo quando estiver “dentro” da secção
    return pathname.startsWith(href + '/');
  };

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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 6,
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

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sections.map((sec) => {
            const visibleItems = sec.items.filter((it) => it.show(ctx));
            if (!visibleItems.length) return null;

            return (
              <div key={sec.title}>
                <div
                  style={{
                    fontSize: 11,
                    opacity: 0.7,
                    textTransform: 'uppercase',
                    letterSpacing: 0.9,
                    margin: '8px 10px 6px',
                  }}
                >
                  {sec.title}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {visibleItems.map((it) => {
                    const active = isActive(it.href);
                    return (
                      <a
                        key={it.href}
                        href={it.href}
                        style={navLinkStyle({ active, soon: it.badge === 'EM BREVE' })}
                        aria-current={active ? 'page' : undefined}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <span
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {it.label}
                          </span>

                          {it.badge === 'EM BREVE' && (
                            <span
                              style={{
                                marginLeft: 'auto',
                                fontSize: 10,
                                fontWeight: 900,
                                letterSpacing: 0.6,
                                padding: '3px 8px',
                                borderRadius: 999,
                                border: '1px solid rgba(255,255,255,.22)',
                                background: 'rgba(255,255,255,.10)',
                                opacity: 0.85,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              EM BREVE
                            </span>
                          )}
                        </span>
                      </a>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div style={{ flex: 1 }} />

        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,.15)',
            paddingTop: 10,
          }}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 900,
                padding: '4px 8px',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,.22)',
                background: 'rgba(255,255,255,.10)',
                whiteSpace: 'nowrap',
              }}
            >
              {(papel || '—').toUpperCase()}
            </span>

            <div
              style={{
                fontSize: 12,
                opacity: 0.85,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
              }}
              title={email ?? undefined}
            >
              {email ?? '—'}
            </div>
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

      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

function navLinkStyle({ active, soon }: { active: boolean; soon: boolean }): CSSProperties {
  return {
    padding: '10px 10px',
    borderRadius: 12,
    color: '#fff',
    textDecoration: 'none',
    opacity: soon ? 0.9 : 0.96,
    fontSize: 13,
    background: active ? 'rgba(255,255,255,.12)' : 'transparent',
    border: active ? '1px solid rgba(255,255,255,.18)' : '1px solid transparent',
    boxShadow: active ? 'inset 0 0 0 1px rgba(0,0,0,.06)' : undefined,
  };
}
