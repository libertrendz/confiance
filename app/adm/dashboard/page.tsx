// app/adm/dashboard/page.tsx
'use client';

const AZUL = '#0e3258';

export default function DashboardAdm() {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: AZUL }}>Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        <Card title="Fornecedores" value="—" />
        <Card title="Clientes" value="—" />
        <Card title="Orçamentos" value="—" />
        <Card title="Faturas pendentes" value="—" />
      </div>
      <p style={{ color: '#64728a', fontSize: 13 }}>
        Em breve: gráficos e KPIs. O importante é não dar 404 e manter a experiência fluida.
      </p>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E9EEF7', borderRadius: 16, padding: 16 }}>
      <div style={{ color: '#49546A', fontSize: 13 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#0e3258' }}>{value}</div>
    </div>
  );
}
