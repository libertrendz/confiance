// lib/queries.ts
import { supa } from './supa';

// pega 1 projeto para exibir no dashboard (o seed criou "Obra A")
export async function getProjetoPadrao() {
  const { data, error } = await supa
    .from('projetos')
    .select('id, nome')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();
  if (error) throw error;
  return data;
}

// resumo por fase: planeado = soma dos itens do orçamento principal
// executado = soma das despesas 'real'/'aprovado' da fase
export async function getResumoFases(projetoId: string) {
  // orçamento principal
  const { data: orc, error: e1 } = await supa
    .from('orcamentos')
    .select('id')
    .eq('projeto_id', projetoId)
    .eq('tipo', 'PRINCIPAL')
    .limit(1)
    .single();
  if (e1) throw e1;

  const orcamentoId = orc.id;

  // itens planeados por fase
  const { data: planeado, error: e2 } = await supa
    .from('orcamento_itens')
    .select('fase_id, quantidade, preco_unitario');
  if (e2) throw e2;

  const somaPlaneado = new Map<string, number>();
  for (const it of planeado ?? []) {
    const k = it.fase_id as string;
    const v = Number(it.quantidade) * Number(it.preco_unitario);
    somaPlaneado.set(k, (somaPlaneado.get(k) ?? 0) + v);
  }

  // despesas executadas por fase (real + aprovado)
  const { data: exec, error: e3 } = await supa
    .from('despesas')
    .select('fase_id, valor, status')
    .eq('orcamento_id', orcamentoId)
    .in('status', ['real','aprovado']);
  if (e3) throw e3;

  const somaExec = new Map<string, number>();
  for (const d of exec ?? []) {
    const k = d.fase_id as string;
    const v = Number(d.valor);
    somaExec.set(k, (somaExec.get(k) ?? 0) + v);
  }

  // fases
  const { data: fases, error: e4 } = await supa
    .from('fases')
    .select('id, nome')
    .eq('projeto_id', projetoId)
    .order('nome', { ascending: true });
  if (e4) throw e4;

  return (fases ?? []).map(f => {
    const planeadoF = somaPlaneado.get(f.id) ?? 0;
    const execF = somaExec.get(f.id) ?? 0;
    const perc = planeadoF > 0 ? Math.min(100, Math.round((execF / planeadoF) * 100)) : 0;
    const risco = planeadoF > 0 && execF / planeadoF >= 0.9;
    return { faseId: f.id, fase: f.nome, planeado: planeadoF, executado: execF, perc, risco };
  });
}
