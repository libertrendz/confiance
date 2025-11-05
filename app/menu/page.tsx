// app/menu/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

export const dynamic = 'force-dynamic';

type AppRole = 'admin' | 'gestor' | 'colaborador';

function shortNameFromEmail(email?: string | null) {
  if (!email) return 'Utilizador';
  const local = email.split('@')[0] || email;
  // limita a 18 chars para caber no mobile
  return local.length > 18 ? local.slice(0, 18) + '…' : local;
}

export default function MenuPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole>('colaborador'); // default seguro
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await supa.auth.getUser();
        if (!alive) return;

        const user = data.user;
        setEmail(user?.email ?? null);

        // Papel no user_metadata
        const meta = (user?.user_metadata || {}) as Record<string, any>;
        const appRole = (meta.app_role as AppRole) || 'colaborador';
        setRole(appRole);
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [supa]);

  function sair() {
    (async () => {
      try {
        await supa.auth.signOut();
      } catch {}
      window.location.replace('/login');
    })();
  }

  if (!ready) {
    return (
      <main style={{ padding: 24, fontFamily: 'system-ui' }}>
        <p style={{ color: '#666' }}>A carregar…</p>
      </main>
    );
  }

  const userShort = shortNameFromEmail(email);

  return (
    <main style={{ padding: 12, fontFamily: 'system-ui', maxWidth: 1100, margin: '0 auto' }}>
      {/* TOPBAR RESPONSIVO */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        {/* Branding + Identidade */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <img
            src="/logo-confiance.png"
            alt="CONFIANCE"
            style={{ height: 36, width: 'auto', flexShrink: 0 }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <strong
              style={{
                fontWeight: 700,
                letterSpacing: 0.2,
                color: '#0A3D91',
                fontSize: 16,
                lineHeight: 1.1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 220,
              }}
              title={email ?? undefined}
            >
              {userShort}
            </strong>
            <span
              style={{
                fontSize: 11,
                color: '#0A3D91',
                background: '#EEF3FF',
                border: '1px solid #D7E3FF',
                alignSelf: 'flex-start',
                padding: '2px 6px',
                borderRadius: 999,
                marginTop: 4,
              }}
            >
              {role.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Botão sair sempre visível */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <button
            onClick={sair}
            aria-label="Terminar sessão"
            title="Terminar sessão"
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid #ddd',
              background: '#fff',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Sair
          </button>
        </div>
      </header>

      {/* GRID DE CARDS */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 12,
        }}
      >
        {/* VISÃO COLABORADOR */}
        {role === 'colaborador' && (
          <>
            <Card
              title="Marcar Ponto"
              desc="Registar ponto com foto e localização."
              actions={[{ href: '/ponto', label: 'Abrir', kind: 'primary' }]}
            />
            <Card
              title="Histórico"
              desc="Consultar marcações e estado (validado/pendente/recusado)."
              actions={[{ href: '/ponto/historico', label: 'Ver histórico', kind: 'ghost' }]}
            />
          </>
        )}

        {/* VISÃO ADMIN/GESTOR */}
        {(role === 'admin' || role === 'gestor') && (
          <>
            <Card
              title="Ponto — Painel ADM"
              desc="Validação diária de marcações, filtros e auditoria."
              actions={[{ href: '/adm/ponto', label: 'Abrir painel', kind: 'primary' }]}
            />
            <Card
              title="Fornecedores"
              desc="Importar, listar e gerir fornecedores."
              actions={[
                { href: '/adm/fornecedores', label: 'Listar', kind: 'ghost' },
                { href: '/adm/fornecedores/novo', label: 'Novo', kind: 'accent' },
                { href: '/adm/fornecedores/importar', label: 'Importar CSV', kind: 'primary' },
              ]}
            />
            <Card
              title="Clientes"
              desc="Cadastro e gestão de clientes."
              actions={[{ href: '/adm/clientes', label: 'Abrir', kind: 'ghost' }]}
            />
            <Card
              title="Orçamentos & Contratos"
              desc="Fases, numeração automática, geração de contrato."
              actions={[
                { href: '/adm/orcamentos', label: 'Orçamentos', kind: 'ghost' },
                { href: '/adm/contratos', label: 'Contratos', kind: 'ghost' },
              ]}
            />
            <Card
              title="Financeiro"
              desc="Faturas, recibos, pagamentos e relatórios."
              actions={[{ href: '/adm/financeiro', label: 'Abrir', kind: 'ghost' }]}
            />
            <Card
              title="Dashboard"
              desc="Indicadores principais por período e empresa."
              actions={[{ href: '/adm/dashboard', label: 'Ver dashboard', kind: 'ghost' }]}
            />
          </>
        )}
      </section>

      {/* Link de diagnóstico opcional */}
      <div style={{ marginTop: 16 }}>
        <a href="/whoami" style={{ fontSize: 12, color: '#6a6f7a' }}>
          Diagnóstico: quem sou eu →
        </a>
      </div>
    </main>
  );
}

type CardAction = { href: string; label: string; kind?: 'primary' | 'accent' | 'ghost' };

function Card({ title, desc, actions = [] }: { title: string; desc: string; actions?: CardAction[] }) {
  return (
    <article
      style={{
        border: '1px solid #E9EEF7',
        borderRadius: 16,
        padding: 16,
        background: '#fff',
        boxShadow: '0 1px 0 rgba(10,61,145,0.05)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: 140,
      }}
    >
      <div>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0A3D91' }}>{title}</h3>
        <p style={{ margin: '8px 0 0 0', color: '#49546A', fontSize: 13 }}>{desc}</p>
      </div>
      {!!actions.length && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {actions.map((a) => (
            <a
              key={a.href + a.label}
              href={a.href}
              style={{
                textDecoration: 'none',
                fontSize: 13,
                padding: '8px 12px',
                borderRadius: 10,
                border: a.kind === 'primary' ? 'none' : '1px solid #D7E3FF',
                background: a.kind === 'primary' ? '#0A3D91' : a.kind === 'accent' ? '#FFD24D' : '#fff',
                color: a.kind === 'primary' ? '#fff' : '#0A3D91',
              }}
            >
              {a.label}
            </a>
          ))}
        </div>
      )}
    </article>
  );
}
