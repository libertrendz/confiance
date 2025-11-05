// app/menu/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

export const dynamic = 'force-dynamic';

type AppRole = 'admin' | 'gestor' | 'externo';

type Profile = {
  nome: string | null;
  papel: AppRole | null;
};

export default function MenuPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole>('externo');
  const [nome, setNome] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: userData } = await supa.auth.getUser();
        const user = userData.user;
        if (!alive) return;

        setEmail(user?.email ?? null);
        const meta = (user?.user_metadata || {}) as Record<string, any>;
        const metaRole = (meta.app_role as AppRole) || 'externo';
        setRole(metaRole);

        if (user?.id) {
          const { data: prof } = await supa
            .from('profiles')
            .select('nome, papel')
            .eq('user_id', user.id)
            .maybeSingle<Profile>();
          if (prof?.nome) setNome(prof.nome);
          if (prof?.papel) setRole(prof.papel);
        }
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => { alive = false; };
  }, [supa]);

  function sair() {
    (async () => { try { await supa.auth.signOut(); } catch {} window.location.replace('/login'); })();
  }

  if (!ready) {
    return <main style={{ padding: 24, fontFamily: 'system-ui' }}><p style={{ color: '#666' }}>A carregar…</p></main>;
  }

  const displayName = (nome?.trim() || email || '—');

  return (
    <main style={{ padding: 12, fontFamily: 'system-ui', maxWidth: 1100, margin: '0 auto' }}>
      <header style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <img src="/logo-confiance.png" alt="CONFIANCE" style={{ height: 36, width: 'auto' }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#0A3D91', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={displayName}>
            {displayName}
          </div>
          <div style={{ fontSize: 11, display: 'inline-block', marginTop: 4, background: '#EEF3FF', color: '#0A3D91', padding: '3px 8px', borderRadius: 999, border: '1px solid #D7E3FF' }}>
            {role.toUpperCase()}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <button onClick={sair} style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' }} aria-label="Terminar sessão">
            Sair
          </button>
        </div>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {/* Utilizador externo (colaborador) */}
        {role === 'externo' && (
          <>
            <Card title="Marcar Ponto" desc="Registar ponto com foto e localização." actions={[{ href: '/ponto', label: 'Abrir', kind: 'primary' }]} />
            <Card title="Histórico" desc="Consultar marcações e estado." actions={[{ href: '/ponto/historico', label: 'Ver histórico', kind: 'ghost' }]} />
          </>
        )}

        {/* Admin/Gestor */}
        {(role === 'admin' || role === 'gestor') && (
          <>
            <Card title="Utilizadores" desc="Criar e gerir contas da equipa." actions={[{ href: '/adm/utilizadores/novo', label: 'Novo utilizador', kind: 'primary' }]} />
            <Card title="Ponto — Painel ADM" desc="Validação diária, filtros e auditoria." actions={[{ href: '/adm/ponto', label: 'Abrir painel', kind: 'ghost' }]} />
            <Card title="Fornecedores" desc="Importar, listar e gerir fornecedores." actions={[
              { href: '/adm/fornecedores', label: 'Listar', kind: 'ghost' },
              { href: '/adm/fornecedores/novo', label: 'Novo', kind: 'accent' },
              { href: '/adm/fornecedores/importar', label: 'Importar CSV', kind: 'primary' },
            ]} />
            <Card title="Clientes" desc="Cadastro e gestão de clientes." actions={[{ href: '/adm/clientes', label: 'Abrir', kind: 'ghost' }]} />
            <Card title="Orçamentos & Contratos" desc="Fases, numeração automática, geração." actions={[
              { href: '/adm/orcamentos', label: 'Orçamentos', kind: 'ghost' },
              { href: '/adm/contratos', label: 'Contratos', kind: 'ghost' },
            ]} />
            <Card title="Financeiro" desc="Faturas, recibos, pagamentos e relatórios." actions={[{ href: '/adm/financeiro', label: 'Abrir', kind: 'ghost' }]} />
            <Card title="Dashboard" desc="Indicadores principais por período." actions={[{ href: '/adm/dashboard', label: 'Ver dashboard', kind: 'ghost' }]} />
          </>
        )}
      </section>
    </main>
  );
}

type CardAction = { href: string; label: string; kind?: 'primary' | 'accent' | 'ghost' };

function Card({ title, desc, actions = [] }: { title: string; desc: string; actions?: CardAction[] }) {
  return (
    <article style={{ border: '1px solid #E9EEF7', borderRadius: 16, padding: 16, background: '#fff', boxShadow: '0 1px 0 rgba(10,61,145,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 140 }}>
      <div>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0A3D91' }}>{title}</h3>
        <p style={{ margin: '8px 0 0 0', color: '#49546A', fontSize: 13 }}>{desc}</p>
      </div>
      {!!actions.length && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {actions.map((a) => (
            <a key={a.href + a.label} href={a.href} style={{
              textDecoration: 'none', fontSize: 13, padding: '8px 12px', borderRadius: 10,
              border: a.kind === 'primary' ? 'none' : '1px solid #D7E3FF',
              background: a.kind === 'primary' ? '#0A3D91' : a.kind === 'accent' ? '#FFD24D' : '#fff',
              color: a.kind === 'primary' ? '#fff' : '#0A3D91',
            }}>
              {a.label}
            </a>
          ))}
        </div>
      )}
    </article>
  );
}
