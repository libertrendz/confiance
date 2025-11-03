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

  function sair() {
    window.location.href = '/logout';
  }

  return (
    <div className="page">
      {/* HEADER RESPONSIVO */}
      <header className="topbar">
        <div className="brand">Menu</div>
        <div className="user">
          <span className="userEmail" title={email}>{email}</span>
          <button className="logoutBtn" onClick={sair} title="Terminar sessão">Sair</button>
        </div>
      </header>

      {/* CONTEÚDO */}
      <main className="content">
        <a className="card" href="/ponto">
          <div className="cardTitle">Marcar Ponto</div>
          <div className="cardDesc">Registo rápido de ponto</div>
        </a>

        <a className="card" href="/adm/fornecedores">
          <div className="cardTitle">Fornecedores</div>
          <div className="cardDesc">Listagem e gestão</div>
        </a>

        <a className="card" href="/adm/fornecedores/importar">
          <div className="cardTitle">Importar Fornecedores (CSV)</div>
          <div className="cardDesc">Staging e normalização blindada</div>
        </a>

        <a className="card" href="/adm/ponto">
          <div className="cardTitle">Relatórios de Ponto (ADM)</div>
          <div className="cardDesc">Presenças, auditoria e exportações</div>
        </a>
      </main>

      <style jsx>{`
        .page {
          min-height: 100dvh;
          background: #fafafa;
        }

        /* ===== Header ===== */
        .topbar {
          position: sticky;
          top: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 16px;
          background: #ffffff;
          border-bottom: 1px solid #eee;
        }

        .brand {
          font-size: 18px;
          font-weight: 700;
          white-space: nowrap;
        }

        .user {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0; /* permite truncamento */
          flex-shrink: 0;
        }

        .userEmail {
          max-width: 48vw;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #333;
          font-size: 14px;
        }

        .logoutBtn {
          background: #111;
          color: #fff;
          border: 0;
          border-radius: 10px;
          padding: 8px 12px;
          font-size: 14px;
          cursor: pointer;
          width: auto;           /* <- nunca 100% */
        }

        .logoutBtn:hover { background: #333; }

        /* ===== Conteúdo ===== */
        .content {
          padding: 16px;
          display: grid;
          gap: 12px;
        }

        .card {
          display: block;
          background: #fff;
          border: 1px solid #eee;
          border-radius: 12px;
          padding: 16px;
          text-decoration: none;
          color: inherit;
          transition: transform .06s ease, box-shadow .06s ease, border-color .06s ease;
        }

        .card:hover {
          border-color: #ddd;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
          transform: translateY(-1px);
        }

        .cardTitle {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .cardDesc {
          font-size: 13px;
          color: #666;
        }

        /* ===== Mobile fine-tuning ===== */
        @media (max-width: 480px) {
          .userEmail { max-width: 44vw; }
          .logoutBtn { padding: 8px 10px; }
        }

        /* ===== Desktop layout ===== */
        @media (min-width: 980px) {
          .content {
            max-width: 960px;
            margin: 0 auto;
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </div>
  );
}
