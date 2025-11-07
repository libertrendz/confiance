'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

type AppRole = 'admin' | 'gestor' | 'externo';

export default function AdmLayout({ children }: { children: React.ReactNode }) {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [nome, setNome] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole>('externo');
  const [activePath, setActivePath] = useState<string>('/adm/dashboard');

  useEffect(() => {
    setActivePath(window.location.pathname);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await supa.auth.getUser();
        const user = data.user;
        if (!user) {
          window.location.replace('/login');
          return;
        }

        setEmail(user.email ?? null);

        const meta = (user.user_metadata || {}) as Record<string, any>;
        let effectiveRole: AppRole =
          (meta.app_role as AppRole) || 'externo';

        const metaNome =
          (meta.nome_exibicao as string) ||
          (meta.nome as string) ||
          (meta.name as string) ||
          null;

        // Complementa com profiles
        const { data: prof } = await supa
          .from('profiles')
          .select('papel, nome_exibicao, nome')
          .eq('user_id', user.id)
          .maybeSingle();

        const papel = (prof?.papel as AppRole) || effectiveRole;
        if (['admin', 'gestor', 'externo'].includes(papel)) {
          effectiveRole = papel;
        }

        const dbNome = prof?.nome_exibicao || prof?.nome || null;
        setNome(metaNome || dbNome || null);

        // Gatekeeper: só entra admin/gestor
        if (effectiveRole === 'externo') {
          window.location.replace('/menu');
          return;
        }
        setRole(effectiveRole);
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [supa]);

  async function sair() {
    try { await supa.auth.signOut(); } catch {}
    window.location.replace('/login');
  }

  if (!ready) {
    return (
      <div style={{ padding: 24, fontFamily: 'system-ui' }}>
        <p style={{ color: '#666' }}>A carregar…</p>
      </div>
    );
  }

  // Paleta oficial
  const azul = '#0e3258';
  const azulClaro = '#eef3ff';

  const items: Array<{ href: string; label: string }> = [
    { href: '/adm/dashboard', label: 'Dashboard' },
    { href: '/adm/utilizadores', label: 'Utilizadores' },
    { href: '/adm/fornecedores', label: 'Fornecedores' },
    { href: '/adm/clientes', label: 'Clientes' },
    { href: '/adm/ponto', label: 'Ponto (ADM)' },
    { href: '/adm/orcamentos', label: 'Orçamentos' },
    { href: '/adm/contratos', label: 'Contratos' },
    { href: '/adm/financeiro', label: 'Financeiro' },
    { href: '/adm/config', label: 'Configurações' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: '100vh', fontFamily: 'system-ui' }}>
      {/* SIDEBAR */}
      <aside
        style={{
          background: azul,
          color: '#fff',
          padding: 16,
          position: 'sticky',
          top: 0,
          alignSelf: 'start',
          height: '100vh',
          overflowY: 'auto',
        }}
      >
        {/* Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <img src="/icon-192.png" alt="CONFIANCE" style={{ width: 28, height: 28, borderRadius: 6 }} />
          <strong style={{ letterSpacing: 0.5 }}>CONFIANCE</strong>
        </div>

        {/* Perfil resumido */}
        <div
          style={{
            background: 'rgba(255,255,255,0.08)',
            borderRadius: 12,
            padding: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>{role.toUpperCase()}</div>
          <div style={{ fontSize: 13, lineHeight: 1.2 }}>
            {nome || email || '—'}
          </div>
        </div>

        {/* Menu */}
        <nav style={{ display: 'grid', gap: 6 }}>
          {items.map(it => {
            const active = activePath.startsWith(it.href);
            return (
              <a
                key={it.href}
                href={it.href}
                style={{
                  textDecoration: 'none',
                  color: '#fff',
                  background: active ? 'rgba(255,255,255,0.14)' : 'transparent',
                  padding: '10px 12px',
                  borderRadius: 10,
                  fontSize: 14,
                }}
              >
                {it.label}
              </a>
            );
          })}
        </nav>

        {/* Rodapé da sidebar */}
        <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 12 }}>
          <button
            onClick={sair}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.35)',
              background: 'transparent',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Terminar sessão
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ background: '#f6f8fb', minHeight: '100vh' }}>
        {/* Topbar fina */}
        <header
          style={{
            background: '#fff',
            borderBottom: '1px solid #e6ecf5',
            padding: '12px 16px',
          }}
        >
          <div style={{ fontWeight: 800, color: azul, letterSpacing: 0.3 }}>
            Área Administrativa
          </div>
        </header>

        <main style={{ padding: 16 }}>
          {children}
        </main>
      </div>

      {/* Responsivo */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media (max-width: 900px) {
              div[style*="grid-template-columns: 260px 1fr"] {
                grid-template-columns: 220px 1fr !important;
              }
            }
            @media (max-width: 720px) {
              div[style*="grid-template-columns: 260px 1fr"] {
                grid-template-columns: 1fr !important;
              }
              aside {
                position: relative !important;
                height: auto !important;
              }
            }
          `,
        }}
      />
    </div>
  );
}
