'use client';
import { useEffect, useState } from 'react';

type Row = {
  id: string;
  codigo: string | null;
  denominacao: string | null;
  nif: string | null;
  email: string | null;
  telefone: string | null;
  ativo: boolean | null;
};

export default function FornecedoresPage() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/fornecedores/list?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
      const j = await res.json();
      if (j.error) throw new Error(j.error);
      setRows(j.rows || []);
    } catch (e:any) {
      alert(e.message || 'Falha ao listar');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <main style={{ padding: 18 }}>
      <h1 className="h1" style={{ marginBottom: 12 }}>Fornecedores</h1>

      <section className="card" style={{ marginBottom: 12 }}>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <input
            placeholder="Pesquisar por nome"
            value={q}
            onChange={e=>setQ(e.target.value)}
            style={{ flex:1, padding:10, border:'1px solid var(--border)', borderRadius:10 }}
          />
          <button className="btn btn-ghost" onClick={load} disabled={loading}>
            {loading ? 'A carregar…' : 'Pesquisar'}
          </button>
          <a className="btn btn-primary" href="/adm/fornecedores/new">Novo fornecedor</a>
        </div>
      </section>

      <section className="card">
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ textAlign:'left', borderBottom:'1px solid var(--border)' }}>
                <th style={{ padding:8 }}>Código</th>
                <th style={{ padding:8 }}>Denominação</th>
                <th style={{ padding:8 }}>NIF</th>
                <th style={{ padding:8 }}>Email</th>
                <th style={{ padding:8 }}>Telefone</th>
                <th style={{ padding:8, textAlign:'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r=>(
                <tr key={r.id} style={{ borderTop:'1px solid var(--border)' }}>
                  <td style={{ padding:8 }}>{r.codigo || '—'}</td>
                  <td style={{ padding:8 }}>{r.denominacao || '—'}</td>
                  <td style={{ padding:8 }}>{r.nif || '—'}</td>
                  <td style={{ padding:8 }}>{r.email || '—'}</td>
                  <td style={{ padding:8 }}>{r.telefone || '—'}</td>
                  <td style={{ padding:8, textAlign:'right' }}>
                    <a className="btn btn-ghost" href={`/adm/fornecedores/${r.id}`}>Editar</a>
                  </td>
                </tr>
              ))}
              {!rows.length && !loading && (
                <tr><td colSpan={6} style={{ padding:10, color:'#667085' }}>Sem registos.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
