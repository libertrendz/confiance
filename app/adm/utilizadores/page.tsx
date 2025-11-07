'use client';

export default function UtilizadoresPage() {
  return (
    <div style={{ background: '#fff', border: '1px solid #E9EEF7', borderRadius: 16, padding: 16 }}>
      <h1 style={{ marginTop: 0, fontSize: 18, fontWeight: 800, color: '#0e3258' }}>Utilizadores</h1>
      <p style={{ color: '#49546A' }}>
        Gestão de utilizadores em construção. Se já tiveres a tela antiga, mantém o link:
      </p>
      <ul>
        <li><a href="/adm/users" style={{ color: '#0e3258' }}>Abrir gestão clássica de utilizadores</a></li>
      </ul>

      <div style={{ marginTop: 12 }}>
        <a
          href="/menu"
          style={{
            textDecoration: 'none',
            fontSize: 13,
            padding: '8px 12px',
            borderRadius: 10,
            border: '1px solid #D7E3FF',
            background: '#fff',
            color: '#0e3258',
          }}
        >
          Voltar ao Menu
        </a>
      </div>
    </div>
  );
}
