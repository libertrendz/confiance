// app/adm/layout.tsx
'use client';

import React, { useEffect, useMemo, useState, type ReactNode, type CSSProperties } from 'react';
import getBrowserSupabase from '@/lib/supa';

type Papel = 'admin' | 'gestor' | 'externo';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const supa = useMemo(() => getBrowserSupabase(), []);
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
        let effectiveRole: Papel =
          (meta.app_role as Papel) || (meta.papel as Papel) || 'externo';

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
          gap: 8,
        }}
      >
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

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {(isAdmin || isGestor) && (
            <a href="/adm/dashboard" style={linkStyle}>
              Dashboard
            </a>
          )}

          {(isAdmin || isGestor) && (
            <a href="/adm/utilizadores" style={linkStyle}>
              Utilizadores
            </a>
          )}

          {(isAdmin || isGestor) && (
            <a href="/adm/ponto" style={linkStyle}>
              Registo de Ponto
            </a>
          )}

          {(isAdmin || isGestor) && (
            <a href="/adm/roteiros" style={linkStyle}>
              Roteiros de trabalho
            </a>
          )}

          {(isAdmin || isGestor) && (
            <a href="/adm/fornecedores" style={linkStyle}>
              Fornecedores
            </a>
          )}

          {isAdmin && (
            <>
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
            </>
          )}
        </nav>

        <div style={{ flex: 1 }} />

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

      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

const linkStyle: CSSProperties = {
  padding: '9px 10px',
  borderRadius: 10,
  color: '#fff',
  textDecoration: 'none',
  opacity: 0.95,
  fontSize: 13,
};
