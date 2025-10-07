export const dynamic = 'force-dynamic';
export const revalidate = 0;

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function PendenciasPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['pendencias'],
    queryFn: async () => {
      const { data, error } = await supabase.from('v_pendencias').select('*').order('ocorrido_em', { ascending: false });
      if (error) throw error;
      return data ?? [];
    }
  });

  const mut = useMutation({
    mutationFn: async (vars: { id: string; empresa_id: string; status: 'aprovado'|'rejeitado'|'ajustado'; obs?: string }) => {
      const { data, error } = await supabase.rpc('ponto_decidir', {
        p_ponto_id: vars.id,
        p_empresa_id: vars.empresa_id,
        p_status: vars.status,
        p_observacao: vars.obs ?? null
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pendencias'] })
  });

  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div>Erro ao carregar.</div>;

  return (
    <div className="space-y-4 mt-6">
      <h1 className="text-2xl font-semibold">Pendências</h1>
      <table className="w-full text-sm border">
        <thead>
          <tr className="bg-gray-50">
            <th className="p-2 border">Funcionário</th>
            <th className="p-2 border">Tipo</th>
            <th className="p-2 border">Quando</th>
            <th className="p-2 border">Ações</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((row: any) => (
            <tr key={row.id}>
              <td className="p-2 border">{row.funcionario_nome}</td>
              <td className="p-2 border">{row.tipo}</td>
              <td className="p-2 border">{new Date(row.ocorrido_em).toLocaleString()}</td>
              <td className="p-2 border">
                <div className="flex gap-2">
                  <button className="border rounded px-2 py-1" onClick={()=>mut.mutate({ id: row.id, empresa_id: row.empresa_id, status: 'aprovado' })}>Aprovar</button>
                  <button className="border rounded px-2 py-1" onClick={()=>mut.mutate({ id: row.id, empresa_id: row.empresa_id, status: 'rejeitado' })}>Rejeitar</button>
                </div>
              </td>
            </tr>
          ))}
          {(!data || data.length===0) && <tr><td colSpan={4} className="p-4 text-center text-gray-500">Sem pendências.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
