// app/adm/despesas/nova/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supa } from '@/lib/supa';

type Fase = { id:string; nome:string };
type Projeto = { id:string; nome:string };
type Orc = { id:string };

export default function NovaDespesaPage() {
  const [loading, setLoading] = useState(true);
  const [projeto, setProjeto] = useState<Projeto|null>(null);
  const [fases, setFases] = useState<Fase[]>([]);
  const [orc, setOrc] = useState<Orc|null>(null);

  const [faseId, setFaseId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [data, setData] = useState<string>(() => new Date().toISOString().slice(0,10));
  const [valor, setValor] = useState<number>(0);

  const [msg, setMsg] = useState<string|null>(null);
  const [err, setErr] = useState<string|null>(null);

  useEffect(() => {
    (async () => {
      try {
        // projeto padrão
        const { data: prj, error: e1 } = await supa
          .from('projetos')
          .select('id,nome')
          .order('created_at', { ascending: true })
          .limit(1).single();
        if (e1) throw e1;
        setProjeto(prj);

        // orçamento principal
        const { data: orcamento, error: e2 } = await supa
          .from('orcamentos')
          .select('id')
          .eq('projeto_id', prj.id)
          .eq('tipo', 'PRINCIPAL')
          .limit(1).single();
        if (e2) throw e2;
        setOrc(orcamento);

        // fases
        const { data: fs, error: e3 } = await supa
          .from('fases')
          .select('id,nome')
          .eq('projeto_id', prj.id)
          .order('nome',{ascending:true});
        if (e3) throw e3;
        setFases(fs ?? []);
        if ((fs ?? []).length) setFaseId(fs![0].id);
      } catch (e:any) {
        setErr(e?.message ?? 'Erro ao carregar');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null); setErr(null);
    try {
      if (!projeto || !orc) throw new Error('Projeto/Orçamento não encontrado');
      if (!faseId) throw new Error('Selecione a fase');

      // empresa_id: para já, usamos a mesma empresa dos orçamentos/seed.
      // Caso precise amarrar, podemos buscar empresa do projeto (se a tabela tiver col).
      const { data: prjFull, error: e0 } = await supa
        .from('projetos')
        .select('empresa_id')
        .eq('id', projeto.id)
        .limit(1).single();
      if (e0) throw e0;

      const payload = {
        empresa_id: prjFull.empresa_id,
        projeto_id: projeto.id,
        fase_id: faseId,
        orcamento_id: orc.id,
        item_id: null,
        fornecedor_id: null,
        data,
        descricao: descricao.trim(),
        valor: Number(valor),
        status: 'real',
      };

      const { error } = await supa.from('despesas').insert(payload);
      if (error) throw error;

      setMsg('Despesa lançada com sucesso!');
      setDescricao('');
      setValor(0);
    } catch (e:any) {
      setErr(e?.message ?? 'Erro ao salvar');
    }
  }

  if (loading) return <div style={{padding:24}}>A carregar…</div>;

  return (
    <div style={{maxWidth:600, margin:'0 auto', padding:24, fontFamily:'system-ui'}}>
      <h1 style={{fontSize:20, fontWeight:700, marginBottom:12}}>Nova Despesa</h1>
      <form onSubmit={salvar} style={{display:'grid', gap:10}}>
        <label>Fase
          <select value={faseId} onChange={e=>setFaseId(e.target.value)} style={{display:'block', width:'100%', padding:8, border:'1px solid #ddd', borderRadius:8}}>
            {fases.map(f=> <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        </label>

        <label>Descrição
          <input value={descricao} onChange={e=>setDescricao(e.target.value)} required
            style={{display:'block', width:'100%', padding:8, border:'1px solid #ddd', borderRadius:8}}/>
        </label>

        <label>Data
          <input type="date" value={data} onChange={e=>setData(e.target.value)} required
            style={{display:'block', width:'100%', padding:8, border:'1px solid #ddd', borderRadius:8}}/>
        </label>

        <label>Valor (€)
          <input type="number" step="0.01" value={valor} onChange={e=>setValor(Number(e.target.value))} required
            style={{display:'block', width:'100%', padding:8, border:'1px solid #ddd', borderRadius:8}}/>
        </label>

        <div style={{display:'flex', gap:8}}>
          <button type="submit" style={{padding:'10px 14px', border:'1px solid #111', background:'#111', color:'#fff', borderRadius:8}}>Salvar</button>
          <a href="/menu"><button type="button" style={{padding:'10px 14px', border:'1px solid #ddd', background:'#fff', borderRadius:8}}>Voltar</button></a>
        </div>
      </form>

      {msg && <p style={{marginTop:8, color:'#14532d'}}>{msg}</p>}
      {err && <p style={{marginTop:8, color:'#7f1d1d'}}>Erro: {err}</p>}
    </div>
  );
}
