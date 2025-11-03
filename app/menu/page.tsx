// app/menu/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

export const dynamic = 'force-dynamic';

export default function MenuPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [email, setEmail] = useState<string>('…');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await supa.auth.getSession();
        const e = data.session?.user?.email || 'Utilizador';
        if (alive) setEmail(e);
      } catch {
        if (alive) setEmail('Utilizador');
      }
    })();
    return () => { alive = false; };
  }, [supa]);

  function sair(){ window.location.href = '/logout'; }

  return (
    <div>
      {/* HEADER */}
      <header className="topbar">
        <div className="brand">
          <span className="logo-dot" />
          Confiance
        </div>
        <div className="user">
          <span className="user-email" title={email}>{email}</span>
          <button className="btn btn-ghost" onClick={sair}>Sair</button>
        </div>
      </header>

      {/* CONTEÚDO */}
      <main>
        <section className="grid cols-2">
          <div className="card">
            <div className="h2">Dashboard</div>
            <p className="muted">Indicadores principais do negócio</p>
            <div style={{ marginTop: 12 }}>
              <a className="btn btn-primary" href="/menu">Abrir</a>
            </div>
          </div>

          <div className="card">
            <div className="h2">Fornecedores</div>
            <p className="muted">Listagem e gestão</p>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <a className="btn btn-primary" href="/adm/fornecedores">Abrir</a>
              <a className="btn btn-ghost" href="/adm/fornecedores/novo">Novo</a>
              <a className="btn btn-ghost" href="/adm/fornecedores/importar">Importar CSV</a>
            </div>
          </div>

          <a className="card" href="/adm/ponto">
            <div className="h2">Ponto (ADM)</div>
            <p className="muted">Relatórios, auditoria e validações</p>
            <div style={{ marginTop: 12 }}>
              <span className="btn btn-primary">Abrir</span>
            </div>
          </a>

          <a className="card" href="/ponto">
            <div className="h2">Marcar Ponto</div>
            <p className="muted">Registo com geolocalização e foto</p>
            <div style={{ marginTop: 12 }}>
              <span className="btn btn-primary">Abrir</span>
            </div>
          </a>

          <a className="card" href="/financeiro">
            <div className="h2">Financeiro</div>
            <p className="muted">Lançamentos, faturas, recibos e pagamentos</p>
            <div style={{ marginTop: 12 }}>
              <span className="btn btn-ghost">Em construção</span>
            </div>
          </a>

          <a className="card" href="/orcamentos">
            <div className="h2">Orçamentos e Contratos</div>
            <p className="muted">Propostas, numeração e templates</p>
            <div style={{ marginTop: 12 }}>
              <span className="btn btn-ghost">Em construção</span>
            </div>
          </a>

          <a className="card" href="/clientes">
            <div className="h2">Clientes</div>
            <p className="muted">Cadastro e gestão</p>
            <div style={{ marginTop: 12 }}>
              <span className="btn btn-ghost">Em construção</span>
            </div>
          </a>

          <div className="card" style={{ textAlign: 'center' }}>
            <div className="h2">Configurações</div>
            <p className="muted">Perfis, branding e preferências do workspace</p>
            <div style={{ marginTop: 12 }}>
              <span className="btn btn-ghost">Em construção</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}