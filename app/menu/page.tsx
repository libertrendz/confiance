// app/menu/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';
import Header from '@/components/Header';

export const dynamic = 'force-dynamic';

export default function MenuPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supa.auth.getUser();
      if (!alive) return;
      setEmail(data.user?.email ?? null);
    })();
    return () => {
      alive = false;
    };
  }, [supa]);

  return (
    <>
      <Header email={email} />

      <main className="grid cols-2" style={{ marginTop: 16 }}>
        <section className="card">
          <h2 className="h2">Ponto (colaborador)</h2>
          <p className="muted">Registar ponto com foto e localização.</p>
          <div style={{ marginTop: 12 }}>
            <a className="btn btn-primary" href="/ponto">Abrir</a>
          </div>
        </section>

        <section className="card">
          <h2 className="h2">Fornecedores (ADM)</h2>
          <p className="muted">Importar, listar e gerir fornecedores.</p>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <a className="btn btn-ghost" href="/adm/fornecedores">Listar</a>
            <a className="btn btn-accent" href="/adm/fornecedores/novo">Novo</a>
            <a className="btn btn-primary" href="/adm/fornecedores/importar">Importar CSV</a>
          </div>
        </section>

        <section className="card">
          <h2 className="h2">Dashboard</h2>
          <p className="muted">Indicadores principais da empresa.</p>
          <div style={{ marginTop: 12 }}>
            <a className="btn btn-ghost" href="/adm/ponto">Painel do Ponto</a>
          </div>
        </section>

        <section className="card">
          <h2 className="h2">Sessão</h2>
          <p className="muted">Gerir sessão de utilizador.</p>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => (window.location.href = '/auth/signout')}>
              Terminar sessão
            </button>
          </div>
        </section>
      </main>
    </>
  );
}
