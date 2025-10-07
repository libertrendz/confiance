"use client";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function OrcamentosPage() {
  const { data: lista, isLoading, error } = useQuery({
    queryKey: ['orcamentos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('orcamentos')
        .select('id, empresa_id, numero, total, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    }
  });

  async function criarExemplo() {
    const empresa_id = prompt('empresa_id?') || '';
    const cliente_id = prompt('cliente_id?') || '';
    const { data, error } = await supabase.rpc('orcamento_criar', { p_empresa_id: empresa_id, p_cliente_id: cliente_id });
    if (error) alert(error.message); else alert(`Criado: ${data}`);
  }

  if (error) return <div>Erro ao carregar.</div>;

  return (
    <div className="space-y-4 mt-6">
      <h1 className="text-2xl font-semibold">Orçamentos</h1>
      <button className="border rounded px-3 py-2" onClick={criarExemplo}>Novo Orçamento</button>
      {isLoading ? <div>Carregando...</div> : (
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-2 border">Número</th>
              <th className="p-2 border">Total</th>
              <th className="p-2 border">Criado em</th>
            </tr>
          </thead>
          <tbody>
            {lista?.map((o:any)=>(
              <tr key={o.id}>
                <td className="p-2 border">{o.numero}</td>
                <td className="p-2 border">{Number(o.total).toFixed(2)}</td>
                <td className="p-2 border">{new Date(o.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {(!lista || lista.length===0) && <tr><td colSpan={3} className="p-4 text-center text-gray-500">Sem dados.</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}
