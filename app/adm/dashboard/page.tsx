'use client';

export default function AdmDashboardPage() {
  return (
    <div style={{ background: '#fff', border: '1px solid #E9EEF7', borderRadius: 16, padding: 16 }}>
      <h1 style={{ marginTop: 0, fontSize: 18, fontWeight: 800, color: '#0e3258' }}>Dashboard</h1>
      <p style={{ color: '#49546A', marginTop: 8 }}>
        Em construção. Aqui entram os KPIs e gráficos de resumo.
      </p>

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
