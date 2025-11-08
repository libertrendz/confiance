// app/adm/fornecedores/page.tsx
export default function FornecedoresPage() {
  return (
    <main>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0e3258', marginBottom: 12 }}>
        Fornecedores
      </h1>
      <p style={{ color: '#49546A', marginBottom: 16 }}>
        Gestão de fornecedores em construção.
      </p>
      <a
        href="/adm/fornecedores/importar"
        style={{
          textDecoration: 'none',
          padding: '10px 12px',
          borderRadius: 10,
          background: '#0e3258',
          color: '#fff',
          fontWeight: 700,
        }}
      >
        Importar CSV
      </a>
    </main>
  );
}
