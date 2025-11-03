// app/menu/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';
import UnderConstruction from '@/components/UnderConstruction';

export const dynamic = 'force-dynamic';

type Role = 'adm' | 'funcionario';

export default function MenuPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [email, setEmail] = useState<string>('…');
  const [role, setRole] = useState<Role>('funcionario');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await supa.auth.getSession();
        const e = data.session?.user?.email || 'Utilizador';
        const r = (data.session?.user?.user_metadata?.role as Role) || 'adm'; // default adm por enquanto
        if (alive) {
          setEmail(e);
          setRole(r);
        }
      } catch {
        if (alive) {
          setEmail('Utilizador');
          setRole('funcionario');
        }
      }
    })();
    return () => { alive = false; };
  }, [supa]);

  function sair() { window.location.href = '/logout'; }

  return (
    <div>
      {/* HEADER */}
      <header className="topbar">
        <div className="brand">Confiance</div>
        <div className="user">
          <span className="user-email" title={email}>{email}</span>
          <button className="btn btn-ghost logout-btn" onClick={sair}>Sair</button>
        </div>
      </header>

      {/* CONTEÚDO */}
      <main>
        {/* Bloco de atalhos por perfil */}
        {role === 'funcionario' ? (
          <section className="grid">
            <div className="card">
              <div className="h2">Marcar Ponto</div>
              <p className="muted">Registo rápido com geolocalização e foto</p>
              <div style={{ marginTop: 12 }}>
                <a className="btn btn-primary" href="/ponto">Abrir</a>
              </div>
            </div>

            <div className="card">
              <div className="h2">Histórico</div>
              <p className="muted">Veja seus registos de presença</p>
              <div style={{ marginTop: 12 }}>
                <a className="btn btn-ghost" href="/ponto/historico">Ver histórico</a>
              </div>
            </div>

            <div className="card">
              <div className="h2">Perfil</div>
              <p className="muted">Dados pessoais e preferências</p>
              <div style={{ marginTop: 12 }}>
                <a className="btn btn-ghost" href="/perfil">Abrir perfil</a>
              </div>
            </div>
          </section>
        ) : (
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
              <p className="muted">Listagem e gestão de fornecedores</p>
              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <a className="btn btn-primary" href="/adm/fornecedores">Abrir</a>
                <a className="btn btn-ghost" href="/adm/fornecedores/novo">Novo</a>
                <a className="btn btn-ghost" href="/adm/fornecedores/importar">Importar CSV</a>
              </div>
            </div>

            <div className="card">
              <div className="h2">Ponto (ADM)</div>
              <p className="muted">Relatórios, auditoria e validações</p>
              <div style={{ marginTop: 12 }}>
                <a className="btn btn-primary" href="/adm/ponto">Abrir</a>
              </div>
            </div>

            <div className="card">
              <div className="h2">Financeiro</div>
              <p className="muted">Lançamentos, faturas, recibos e pagamentos</p>
              <div style={{ marginTop: 12 }}>
                <a className="btn btn-ghost" href="/financeiro">Abrir</a>
              </div>
            </div>

            <div className="card">
              <div className="h2">Orçamentos e Contratos</div>
              <p className="muted">Propostas, numeração automática e templates</p>
              <div style={{ marginTop: 12 }}>
                <a className="btn btn-ghost" href="/orcamentos">Abrir</a>
              </div>
            </div>

            <div className="card">
              <div className="h2">Clientes</div>
              <p className="muted">Cadastro e gestão de clientes</p>
              <div style={{ marginTop: 12 }}>
                <a className="btn btn-ghost" href="/clientes">Abrir</a>
              </div>
            </div>

            <UnderConstruction title="Configurações" note="Perfis, branding e preferências do workspace" />
          </section>
        )}
      </main>
    </div>
  );
}
