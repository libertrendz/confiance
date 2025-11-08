'use client';

export default function FornecedoresPage() {
  return (
    <main style={{ fontFamily:'system-ui' }}>
      <header style={{ marginBottom: 12 }}>
        <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:'#0e3258' }}>Fornecedores</h1>
        <p style={{ color:'#445' }}>Gestão de fornecedores.</p>
      </header>

      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom: 16 }}>
        <a href="/adm/fornecedores/lista" style={btn('ghost')}>Listar</a>
        <a href="/adm/fornecedores/novo" style={btn('ghost')}>Novo</a>
        <a href="/adm/fornecedores/importar" style={btn('primary')}>Importar CSV</a>
        <a href="/adm/fornecedores/exportar" style={btn('ghost')}>Exportar</a>
      </div>

      <div style={{ border:'1px dashed #d9e1ee', borderRadius:12, padding:16, background:'#fff' }}>
        <p style={{ margin:0, color:'#586380' }}>Páginas em construção. As ações acima já estão organizadas.</p>
      </div>
    </main>
  );
}

function btn(kind: 'primary'|'ghost') {
  return {
    textDecoration:'none',
    fontSize:13,
    padding:'8px 12px',
    borderRadius:10,
    border: kind === 'primary' ? 'none' : '1px solid #D7E3FF',
    background: kind === 'primary' ? '#0e3258' : '#fff',
    color: kind === 'primary' ? '#fff' : '#0e3258',
    fontWeight:700,
  } as const;
}
