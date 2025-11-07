// app/adm/fornecedores/page.tsx
'use client';

export default function FornecedoresAdmPage() {
  return (
    <main style={{ display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: '100vh' }}>
      <aside style={{ borderRight: '1px solid #E9EEF7', padding: 16 }}>
        <h3 style={{ margin: 0, color: '#0e3258' }}>Admin</h3>
        <nav style={{ marginTop: 12, display: 'grid', gap: 8 }}>
          <a href="/adm/dashboard">Dashboard</a>
          <a href="/adm/utilizadores">Utilizadores</a>
          <a href="/adm/ponto">Ponto</a>
          <a href="/adm/fornecedores" style={{ fontWeight: 700, color: '#0e3258' }}>Fornecedores</a>
          <a href="/adm/clientes">Clientes</a>
          <a href="/adm/orcamentos">Orçamentos</a>
          <a href="/adm/contratos">Contratos</a>
          <a href="/adm/financeiro">Financeiro</a>
          <a href="/adm/config">Configurações</a>
        </nav>
      </aside>

      <section style={{ padding: 18, fontFamily: 'system-ui', maxWidth: 1100 }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0e3258' }}>Fornecedores</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href="/adm/fornecedores/novo"
               style={{ textDecoration: 'none', padding: '8px 12px', borderRadius: 10, border: '1px solid #D7E3FF', color: '#0e3258' }}>
              Novo
            </a>
            <a href="/adm/fornecedores/importar"
               style={{ textDecoration: 'none', padding: '8px 12px', borderRadius: 10, background: '#0e3258', color: '#fff' }}>
              Importar CSV
            </a>
          </div>
        </header>

        <div style={{
          border: '1px dashed #D7E3FF',
          borderRadius: 12,
          padding: 24,
          background: '#F7FAFF'
        }}>
          <h3 style={{ marginTop: 0, color: '#0e3258' }}>Em construção</h3>
          <p style={{ color: '#49546A', fontSize: 14 }}>
            Listagem e busca com trigram; integração com staging <code>fornecedores_import_stg</code> e normalização.
          </p>
        </div>
      </section>
    </main>
  );
}
