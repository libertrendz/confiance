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
    return () => {
      alive = false;
    };
  }, [supa]);

  function sair() {
    window.location.href = '/logout';
  }

  return (
    <div>
      {/* TOPO RESPONSIVO */}
      <div className="topbar">
        <div className="brand">Menu</div>
        <div className="user">
          <span className="user-email">{email}</span>
          <button className="logout-btn" onClick={sair} title="Terminar sessão">
            Sair
          </button>
        </div>
      </div>

      {/* CONTEÚDO DO MENU */}
      <main>
        <div style={{ display: 'grid', gap: 12 }}>
          {/* Exemplos de atalhos (ajuste conforme teu app) */}
          <a
            href="/ponto"
            style={{
              display: 'block',
              padding: 16,
              borderRadius: 12,
              border: '1px solid #eee',
              background: '#fff',
            }}
          >
            Marcar Ponto
          </a>

          <a
            href="/adm/fornecedores"
            style={{
              display: 'block',
              padding: 16,
              borderRadius: 12,
              border: '1px solid #eee',
              background: '#fff',
            }}
          >
            Fornecedores
          </a>

          <a
            href="/adm/fornecedores/importar"
            style={{
              display: 'block',
              padding: 16,
              borderRadius: 12,
              border: '1px solid #eee',
              background: '#fff',
            }}
          >
            Importar Fornecedores (CSV)
          </a>

          <a
            href="/adm/ponto"
            style={{
              display: 'block',
              padding: 16,
              borderRadius: 12,
              border: '1px solid #eee',
              background: '#fff',
            }}
          >
            Relatórios de Ponto (ADM)
          </a>
        </div>
      </main>
    </div>
  );
}
