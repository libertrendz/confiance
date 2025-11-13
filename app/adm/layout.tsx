// app/adm/layout.tsx
import '@/app/globals.css';

const LOGO_URL = 'https://cfremxfgqehqnbqummti.supabase.co/storage/v1/object/public/images/LOGO%20CONFIANCE.png';

export const metadata = {
  title: 'CONFIANCE — Admin',
  description: 'Backoffice administrativo',
};

export default function AdmLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
        {/* Sidebar azul */}
        <aside
          style={{
            width: 260,
            background: 'var(--brand-1)',
            color: '#fff',
            padding: '16px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <a href="/adm/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8 }}>
            <img
              src={LOGO_URL}
              alt="CONFIANCE"
              style={{ height: 54, width: 'auto', objectFit: 'contain', display: 'block' }}
            />
            <span style={{ fontWeight: 900, letterSpacing: .3 }}>CONFIANCE</span>
          </a>

          <nav style={{ display: 'grid', gap: 6, marginTop: 6 }}>
            <a href="/adm/dashboard" className="btn btn-ghost" style={navBtn}>Dashboard</a>
            <a href="/adm/fornecedores" className="btn btn-ghost" style={navBtn}>Fornecedores</a>
            <a href="/adm/utilizadores" className="btn btn-ghost" style={navBtn}>Utilizadores</a>
            <a href="/ponto" className="btn btn-ghost" style={navBtn}>Ponto</a>
            <a href="/configuracoes" className="btn btn-ghost" style={navBtn}>Configurações</a>
          </nav>

          <div style={{ marginTop: 'auto' }}>
            <a href="/login" className="btn btn-ghost" style={{ ...navBtn, justifyContent: 'center' }}>Sair</a>
          </div>
        </aside>

        {/* Área principal */}
        <section style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Topbar clara */}
          <header className="topbar">
            <div className="brand">
              <img src={LOGO_URL} alt="" className="brand-logo" />
              <strong>CONFIANCE</strong>
            </div>
            <div className="user">
              <span className="pill">ADMIN</span>
              <a href="/login" className="btn btn-ghost">Sair</a>
            </div>
          </header>

          <main style={{ padding: 'var(--space-3)' }}>
            {children}
          </main>

          <footer
            style={{
              textAlign: 'center',
              fontSize: 12,
              color: 'var(--muted)',
              padding: '12px 0',
              borderTop: '1px solid var(--border)',
              background: 'var(--surface)',
            }}
          >
            Powered by <strong>LIBERTRENDZ®</strong>
          </footer>
        </section>
      </body>
    </html>
  );
}

const navBtn: React.CSSProperties = {
  width: '100%',
  textAlign: 'left',
  color: '#fff',
  borderColor: 'rgba(255,255,255,.15)',
  background: 'transparent',
};
