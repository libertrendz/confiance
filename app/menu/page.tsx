// app/menu/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

export const dynamic = 'force-dynamic';

type AppRole = 'admin' | 'gestor' | 'externo';

export default function MenuPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole>('externo');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: userData } = await supa.auth.getUser();
        const user = userData.user;
        const uid = user?.id || null;
        setEmail(user?.email ?? null);

        // 1) Papel do user_metadata (JWT)
        const meta = (user?.user_metadata || {}) as Record<string, any>;
        let effectiveRole = (meta.app_role as AppRole) || 'externo';

        // 2) Fallback: profiles.papel
        if (!['admin', 'gestor', 'externo'].includes(effectiveRole) && uid) {
          const { data: prof } = await supa
            .from('profiles')
            .select('papel')
            .eq('user_id', uid)
            .maybeSingle();
          const papel = (prof?.papel as AppRole) || 'externo';
          if (['admin', 'gestor', 'externo'].includes(papel)) {
            effectiveRole = papel;
          }
        }

        // Admin/Gestor → layout ADM
        if (effectiveRole === 'admin' || effectiveRole === 'gestor') {
          window.location.replace('/adm/dashboard');
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
    try {
      await supa.auth.signOut();
    } catch {}
    window.location.replace('/login');
  }

  if (!ready) {
    return (
      <main style={{ padding: 24, fontFamily: 'system-ui' }}>
        <p style={{ color: '#666' }}>A carregar…</p>
      </main>
    );
  }

  return (
    <main
      style={{
        padding: 16,
        fontFamily: 'system-ui',
        maxWidth: 1100,
        margin: '0 auto',
      }}
    >
      {/* TOPBAR (Grid: logo | info | sair) */}
      <header
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          alignItems: 'center',
          columnGap: 12,
          rowGap: 8,
          marginBottom: 16,
        }}
      >
        {/* Col 1: Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 180 }}>
          <img
            src="/logo-confiance.png"
            alt="CONFIANCE"
            style={{ height: 40, width: 'auto' }}
          />
          <span
            style={{
              fontWeight: 800,
              letterSpacing: 0.3,
              color: '#0e3258',
              fontSize: 18,
              whiteSpace: 'nowrap',
            }}
          >
            CONFIANCE
          </span>
        </div>

        {/* Col 2: Info (chip + email) — cresce, corta com ellipsis */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 8,
            minWidth: 0, // importante pro ellipsis funcionar
          }}
        >
          <span
            style={{
              fontSize: 12,
              background: '#EEF3FF',
              color: '#0e3258',
              padding: '4px 8px',
              borderRadius: 999,
              border: '1px solid #D7E3FF',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {role.toUpperCase()}
          </span>
          <span
            style={{
              fontSize: 13,
              color: '#555',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
            }}
            title={email ?? undefined}
          >
            {email ?? '—'}
          </span>
        </div>

        {/* Col 3: Sair — sempre na direita */}
        <div>
          <button
            onClick={sair}
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid #ddd',
              background: '#fff',
              cursor: 'pointer',
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
          >
            Sair
          </button>
        </div>

        {/* Responsividade: em telas estreitas, info vai para linha de baixo e ocupa 3 colunas */}
        <style
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `
            @media (max-width: 560px) {
              header {
                grid-template-columns: 1fr auto;
              }
              header > div:nth-child(2) {
                grid-column: 1 / span 2;
                justify-content: flex-start;
                order: 3;
              }
            }
          `,
          }}
        />
      </header>

      {/* GRID DE CARDS */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 12,
        }}
      >
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
      </section>
    </main>
  );
}

type CardAction = {
  href: string;
  label: string;
  kind?: 'primary' | 'accent' | 'ghost';
};

function Card({
  title,
  desc,
  actions = [],
}: {
  title: string;
  desc: string;
  actions?: CardAction[];
}) {
  return (
    <article
      style={{
        border: '1px solid #E9EEF7',
        borderRadius: 16,
        padding: 16,
        background: '#fff',
        boxShadow: '0 1px 0 rgba(14,50,88,0.06)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: 140,
      }}
    >
      <div>
        <h3
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 800,
            color: '#0e3258',
          }}
        >
          {title}
        </h3>
        <p style={{ margin: '8px 0 0 0', color: '#49546A', fontSize: 13 }}>
          {desc}
        </p>
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
                background:
                  a.kind === 'primary'
                    ? '#0e3258'
                    : a.kind === 'accent'
                    ? '#FFD24D'
                    : '#fff',
                color: a.kind === 'primary' ? '#fff' : '#0e3258',
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
