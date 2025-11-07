// app/menu/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

export const dynamic = 'force-dynamic';

type AppRole = 'admin' | 'gestor' | 'externo';

export default function MenuPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [email, setEmail] = useState<string | null>(null);
  const [nome, setNome] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole>('externo');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await supa.auth.getUser();
        const user = data.user;
        if (!user) return;

        const uid = user.id;
        const rawEmail = user.email ?? null;

        // Busca nome e papel do profile
        const { data: prof } = await supa
          .from('profiles')
          .select('papel, nome_exibicao, nome')
          .eq('user_id', uid)
          .maybeSingle();

        const papel = (prof?.papel as AppRole) || 'externo';
        setRole(papel);

        const display =
          (prof?.nome_exibicao && prof.nome_exibicao.trim()) ||
          (prof?.nome && prof.nome.trim()) ||
          (rawEmail ? rawEmail.split('@')[0] : '—');

        setNome(display);
        setEmail(rawEmail);
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
      <header
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          alignItems: 'center',
          columnGap: 10,
          rowGap: 8,
          marginBottom: 16,
        }}
      >
        {/* PERFIL */}
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            background: '#EEF3FF',
            color: '#0e3258',
            padding: '6px 10px',
            borderRadius: 999,
            border: '1px solid #D7E3FF',
            whiteSpace: 'nowrap',
          }}
        >
          {role.toUpperCase()}
        </span>

        {/* NOME / EMAIL */}
        <div
          style={{
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span
            style={{
              color: '#0e3258',
              fontWeight: 800,
              fontSize: 18,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
            }}
            title={(nome || email) ?? undefined}
          >
            {nome || email || '—'}
          </span>
        </div>

        {/* SAIR */}
        <div>
          <button
            onClick={sair}
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid #ddd',
              background: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            Sair
          </button>
        </div>

        <style
          dangerouslySetInnerHTML={{
            __html: `
              @media (max-width: 480px) {
                header { grid-template-columns: 1fr auto; }
                header > span:nth-child(1) { order: 1; }
                header > div:nth-child(2) { order: 3; grid-column: 1 / span 2; text-align: left; }
                header > div:nth-child(3) { order: 2; justify-self: end; }
              }
            `,
          }}
        />
      </header>

      {/* GRID DE CARDS (colaborador/externo) */}
      {role === 'externo' && (
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
      )}

      {/* ADMIN/GESTOR redirecionam manualmente via sidebar */}
      {(role === 'admin' || role === 'gestor') && (
        <section style={{ color: '#0e3258', paddingTop: 10 }}>
          <p>Usa o menu lateral para navegar nas secções administrativas.</p>
        </section>
      )}
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
