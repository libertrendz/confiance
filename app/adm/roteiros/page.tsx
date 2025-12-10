'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

type ColabOption = {
  user_id: string;
  nome: string;
};

type TarefaOption = {
  id: string;
  nome: string;
};

type LocalOption = {
  id: string;
  nome: string;
};

type RoteiroRow = {
  id: string;
  usuario_id: string;
  tarefa_id: string;
  data_dia: string;
  data_fim: string | null;
  status: string;
  local_id: string | null;
  observacoes: string | null;
  created_at: string;
};

export default function RoteirosPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);

  const [colabs, setColabs] = useState<ColabOption[]>([]);
  const [tarefas, setTarefas] = useState<TarefaOption[]>([]);
  const [locais, setLocais] = useState<LocalOption[]>([]);
  const [lista, setLista] = useState<RoteiroRow[]>([]);

  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingLista, setLoadingLista] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Form
  const [usuarioId, setUsuarioId] = useState<string>('');
  const [tarefaId, setTarefaId] = useState<string>('');
  const [localId, setLocalId] = useState<string>('');
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');

  async function loadOptions() {
    setLoadingOptions(true);
    setErr(null);

    try {
      // COLABORADORES: vêm de public.colaboradores
      const { data: colabData, error: colabError } = await supa
        .from('colaboradores')
        .select('user_id, nome')
        .not('user_id', 'is', null)
        .order('nome', { ascending: true });

      if (colabError) {
        console.error('Erro ao carregar colaboradores', colabError);
        throw colabError;
      }

      setColabs(
        (colabData || []).map((c: any) => ({
          user_id: c.user_id,
          nome: c.nome ?? '(sem nome)',
        }))
      );

      // TAREFAS PADRÃO
      const { data: tarefaData, error: tarefaError } = await supa
        .from('tarefas_padrao')
        .select('id, nome, ativo')
        .eq('ativo', true)
        .order('nome', { ascending: true });

      if (tarefaError) {
        console.error('Erro ao carregar tarefas_padrao', tarefaError);
        throw tarefaError;
      }

      setTarefas(
        (tarefaData || []).map((t: any) => ({
          id: t.id,
          nome: t.nome ?? '(sem nome)',
        }))
      );

      // LOCAIS PERMITIDOS
      const { data: locaisData, error: locaisError } = await supa
        .from('locais_permitidos')
        .select('id, nome, ativo')
        .eq('ativo', true)
        .order('created_at', { ascending: true });

      if (locaisError) {
        console.error('Erro ao carregar locais_permitidos', locaisError);
        throw locaisError;
      }

      setLocais(
        (locaisData || []).map((l: any) => ({
          id: l.id,
          nome: l.nome ?? '(sem nome)',
        }))
      );
    } catch (e: any) {
      setErr(e?.message || 'Falha ao carregar opções (colaboradores/tarefas/locais).');
    } finally {
      setLoadingOptions(false);
    }
  }

  async function loadLista() {
    setLoadingLista(true);
    setErr(null);
    try {
      const { data, error } = await supa
        .from('ponto_roteiros')
        .select('id, usuario_id, tarefa_id, data_dia, data_fim, status, local_id, observacoes, created_at')
        .order('data_dia', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Erro ao carregar ponto_roteiros', error);
        throw error;
      }

      setLista((data as RoteiroRow[]) || []);
    } catch (e: any) {
      setErr(e?.message || 'Falha ao carregar roteiros.');
      setLista([]);
    } finally {
      setLoadingLista(false);
    }
  }

  useEffect(() => {
    loadOptions();
    loadLista();
  }, []);

  async function criarRoteiro(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    if (!usuarioId || !tarefaId || !dataInicio) {
      setErr('Colaborador, tarefa e data de início são obrigatórios.');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        usuario_id: usuarioId,
        tarefa_id: tarefaId,
        data_dia: dataInicio, // campo base
        status: 'planeado',
      };

      if (dataFim) payload.data_fim = dataFim;
      if (localId) payload.local_id = localId;
      if (observacoes) payload.observacoes = observacoes;

      const { error } = await supa.from('ponto_roteiros').insert([payload]);

      if (error) {
        console.error('Erro ao criar roteiro', error);
        throw error;
      }

      setMsg('Roteiro criado com sucesso.');
      // limpa form
      setTarefaId('');
      setLocalId('');
      setDataInicio('');
      setDataFim('');
      setObservacoes('');

      await loadLista();
    } catch (e: any) {
      setErr(e?.message || 'Falha ao criar roteiro.');
    } finally {
      setSaving(false);
    }
  }

  function nomeColab(id: string) {
    const c = colabs.find((c) => c.user_id === id);
    return c?.nome || id;
  }

  function nomeTarefa(id: string) {
    const t = tarefas.find((t) => t.id === id);
    return t?.nome || id;
  }

  function nomeLocal(id: string | null) {
    if (!id) return '—';
    const l = locais.find((l) => l.id === id);
    return l?.nome || id;
  }

  return (
    <main style={{ padding: 18 }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <h1 className="h1">Roteiros de trabalho</h1>
        <button className="btn btn-ghost" onClick={() => { loadOptions(); loadLista(); }} disabled={loadingOptions || loadingLista}>
          {loadingOptions || loadingLista ? 'A carregar…' : 'Recarregar'}
        </button>
      </header>

      {/* FORM NOVO ROTEIRO */}
      <section className="card" style={{ marginBottom: 16, padding: 16 }}>
        <h2 className="h2" style={{ marginBottom: 8 }}>Novo roteiro</h2>
        <p className="muted" style={{ marginBottom: 12 }}>
          Defina colaborador, tarefa, período e local de trabalho. Estes dados serão usados no cálculo de presença (geo/raio)
          e para associações de tarefas do dia.
        </p>

        {err && (
          <p style={{ color: 'crimson', marginBottom: 8 }}>{err}</p>
        )}
        {msg && (
          <p style={{ color: 'green', marginBottom: 8 }}>{msg}</p>
        )}

        <form
          onSubmit={criarRoteiro}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
            alignItems: 'flex-start',
          }}
        >
          {/* COLABORADOR */}
          <div>
            <label className="muted">Colaborador</label>
            <select
              value={usuarioId}
              onChange={(e) => setUsuarioId(e.target.value)}
              required
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: '#fff',
              }}
            >
              <option value="">Selecione…</option>
              {colabs.map((c) => (
                <option key={c.user_id} value={c.user_id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          {/* TAREFA */}
          <div>
            <label className="muted">Tarefa</label>
            <select
              value={tarefaId}
              onChange={(e) => setTarefaId(e.target.value)}
              required
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: '#fff',
              }}
            >
              <option value="">Selecione…</option>
              {tarefas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>

          {/* LOCAL */}
          <div>
            <label className="muted">Local de trabalho</label>
            <select
              value={localId}
              onChange={(e) => setLocalId(e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: '#fff',
              }}
            >
              <option value="">Selecione…</option>
              {locais.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </select>
          </div>

          {/* DATAS */}
          <div>
            <label className="muted">Data início</label>
            <input
              type="date"
              required
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: '#fff',
              }}
            />
          </div>

          <div>
            <label className="muted">Data fim (opcional)</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: '#fff',
              }}
            />
          </div>

          {/* OBS */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="muted">Observações (opcional)</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: '#fff',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ gridColumn: '1 / -1', marginTop: 4 }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || loadingOptions}
            >
              {saving ? 'A criar…' : 'Criar roteiro'}
            </button>
          </div>
        </form>
      </section>

      {/* LISTA DE ROTEIROS */}
      <section className="card" style={{ padding: 16 }}>
        <h2 className="h2" style={{ marginBottom: 8 }}>Roteiros existentes</h2>

        {loadingLista && <p className="muted">A carregar roteiros…</p>}

        {!loadingLista && !lista.length && (
          <p className="muted">Sem roteiros registados.</p>
        )}

        {!!lista.length && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: 8 }}>Colaborador</th>
                  <th style={{ padding: 8 }}>Tarefa</th>
                  <th style={{ padding: 8 }}>Local</th>
                  <th style={{ padding: 8 }}>Data início</th>
                  <th style={{ padding: 8 }}>Data fim</th>
                  <th style={{ padding: 8 }}>Status</th>
                  <th style={{ padding: 8 }}>Criado em</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: 8 }}>{nomeColab(r.usuario_id)}</td>
                    <td style={{ padding: 8 }}>{nomeTarefa(r.tarefa_id)}</td>
                    <td style={{ padding: 8 }}>{nomeLocal(r.local_id)}</td>
                    <td style={{ padding: 8 }}>
                      {r.data_dia ? new Date(r.data_dia).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: 8 }}>
                      {r.data_fim ? new Date(r.data_fim).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: 8 }}>{r.status}</td>
                    <td style={{ padding: 8 }}>
                      {r.created_at ? new Date(r.created_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
