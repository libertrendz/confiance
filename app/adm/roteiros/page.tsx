// app/adm/roteiros/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

type ColabOption = {
  id: string;          // id do colaborador (tabela colaboradores / view)
  usuario_id: string;  // auth.users.id / profiles.user_id
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
  tarefa_id: string | null;
  local_id: string | null;
  data_dia: string;
  data_fim: string | null;
  status: string;
  observacoes: string | null;
};

type FormState = {
  usuario_id: string;
  tarefa_id: string;
  local_id: string;
  data_dia: string;
  data_fim: string;
  observacoes: string;
};

export default function RoteirosPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [colabs, setColabs] = useState<ColabOption[]>([]);
  const [tarefas, setTarefas] = useState<TarefaOption[]>([]);
  const [locais, setLocais] = useState<LocalOption[]>([]);
  const [lista, setLista] = useState<RoteiroRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    usuario_id: '',
    tarefa_id: '',
    local_id: '',
    data_dia: '',
    data_fim: '',
    observacoes: '',
  });

  async function carregarOpcoes() {
    setErr(null);
    try {
      // 1) Colaboradores externos com user_id
      {
        const { data, error } = await supa
          .from('v_colaboradores_perfis')
          .select('id, nome, user_id, papel')
          .order('nome', { ascending: true });

        if (error) throw error;

        const externosComUser = (data || [])
          .filter((r: any) => r.user_id && r.papel === 'externo')
          .map((r: any) => ({
            id: r.id as string,
            usuario_id: r.user_id as string,
            nome: (r.nome as string) || '—',
          }));

        setColabs(externosComUser);
      }

      // 2) Tarefas ativas
      {
        const { data, error } = await supa
          .from('tarefas_padrao')
          .select('id, nome')
          .eq('ativo', true)
          .order('nome', { ascending: true });

        if (error) throw error;

        setTarefas(
          (data || []).map((r: any) => ({
            id: r.id as string,
            nome: (r.nome as string) || '—',
          })),
        );
      }

      // 3) Locais permitidos ativos
      {
        const { data, error } = await supa
          .from('locais_permitidos')
          .select('id, nome')
          .eq('ativo', true)
          .order('nome', { ascending: true });

        if (error) throw error;

        setLocais(
          (data || []).map((r: any) => ({
            id: r.id as string,
            nome: (r.nome as string) || '—',
          })),
        );
      }
    } catch (e: any) {
      console.error('Erro ao carregar opções', e);
      setErr(e?.message || 'Falha ao carregar colaboradores / tarefas / locais.');
      setColabs([]);
      setTarefas([]);
      setLocais([]);
    }
  }

  async function carregarRoteiros() {
    setLoading(true);
    setErr(null);
    try {
      const { data, error } = await supa
        .from('ponto_roteiros')
        .select('id, usuario_id, tarefa_id, local_id, data_dia, data_fim, status, observacoes')
        .order('data_dia', { ascending: false })
        .limit(200);

      if (error) throw error;
      setLista((data as any as RoteiroRow[]) || []);
    } catch (e: any) {
      console.error('Erro ao carregar ponto_roteiros', e);
      setErr(e?.message || 'Falha ao carregar roteiros.');
      setLista([]);
    } finally {
      setLoading(false);
    }
  }

  async function recarregarTudo() {
    await carregarOpcoes();
    await carregarRoteiros();
  }

  useEffect(() => {
    recarregarTudo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function criarRoteiro(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      if (!form.usuario_id || !form.tarefa_id || !form.local_id || !form.data_dia) {
        throw new Error('Preencha colaborador, tarefa, local e data de início.');
      }

      const payload: any = {
        usuario_id: form.usuario_id,
        tarefa_id: form.tarefa_id,
        local_id: form.local_id,
        data_dia: form.data_dia,
        status: 'planeado',
      };

      if (form.data_fim) {
        payload.data_fim = form.data_fim;
      }
      if (form.observacoes.trim()) {
        payload.observacoes = form.observacoes.trim();
      }

      const { error } = await supa.from('ponto_roteiros').insert(payload);
      if (error) throw error;

      // limpa apenas os campos "variáveis"
      setForm((f) => ({
        ...f,
        tarefa_id: '',
        local_id: '',
        data_dia: '',
        data_fim: '',
        observacoes: '',
      }));

      await carregarRoteiros();
    } catch (e: any) {
      console.error('Erro ao criar roteiro', e);
      setErr(e?.message || 'Falha ao criar roteiro.');
    } finally {
      setSaving(false);
    }
  }

  // Helpers para mostrar nomes nas linhas
  const colabByUserId = (usuario_id: string) =>
    colabs.find((c) => c.usuario_id === usuario_id);

  const tarefaById = (id: string | null) =>
    id ? tarefas.find((t) => t.id === id) : undefined;

  const localById = (id: string | null) =>
    id ? locais.find((l) => l.id === id) : undefined;

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
        <button className="btn btn-ghost" onClick={recarregarTudo} disabled={loading}>
          {loading ? 'A carregar…' : 'Recarregar'}
        </button>
      </header>

      <section
        className="card"
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'minmax(0, 420px) minmax(0, 1fr)',
          alignItems: 'flex-start',
        }}
      >
        {/* NOVO ROTEIRO */}
        <div>
          <h2 className="h2">Novo roteiro</h2>
          <p className="muted" style={{ marginTop: 4 }}>
            Defina colaborador externo, tarefa, período e local de trabalho. Estes dados serão usados
            no cálculo de presença (geolocalização / raio) e para associação das tarefas do dia.
          </p>

          <form onSubmit={criarRoteiro} style={{ display: 'grid', gap: 12, marginTop: 12 }}>
            {/* Colaborador */}
            <div>
              <label className="muted">Colaborador</label>
              <select
                value={form.usuario_id}
                onChange={(e) => setForm((f) => ({ ...f, usuario_id: e.target.value }))}
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
                  <option key={c.usuario_id} value={c.usuario_id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Tarefa */}
            <div>
              <label className="muted">Tarefa</label>
              <select
                value={form.tarefa_id}
                onChange={(e) => setForm((f) => ({ ...f, tarefa_id: e.target.value }))}
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

            {/* Local */}
            <div>
              <label className="muted">Local de trabalho</label>
              <select
                value={form.local_id}
                onChange={(e) => setForm((f) => ({ ...f, local_id: e.target.value }))}
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

            {/* Datas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label className="muted">Data início</label>
                <input
                  type="date"
                  value={form.data_dia}
                  onChange={(e) => setForm((f) => ({ ...f, data_dia: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: 10,
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                  }}
                />
              </div>
              <div>
                <label className="muted">Data fim (opcional)</label>
                <input
                  type="date"
                  value={form.data_fim}
                  onChange={(e) => setForm((f) => ({ ...f, data_fim: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: 10,
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                  }}
                />
              </div>
            </div>

            {/* Observações */}
            <div>
              <label className="muted">Observações (opcional)</label>
              <textarea
                rows={3}
                value={form.observacoes}
                onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                style={{
                  width: '100%',
                  padding: 10,
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  resize: 'vertical',
                }}
              />
            </div>

            {err && (
              <p style={{ color: 'crimson', marginTop: 4 }}>
                {err}
              </p>
            )}

            <div>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'A criar…' : 'Criar roteiro'}
              </button>
            </div>
          </form>
        </div>

        {/* LISTA EXISTENTE */}
        <div>
          <h2 className="h2">Roteiros existentes</h2>

          {!lista.length && !loading && (
            <p className="muted" style={{ marginTop: 8 }}>
              Sem roteiros registados.
            </p>
          )}

          {!!lista.length && (
            <div style={{ marginTop: 8, overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: 8 }}>Colaborador</th>
                    <th style={{ padding: 8 }}>Tarefa</th>
                    <th style={{ padding: 8 }}>Local</th>
                    <th style={{ padding: 8 }}>Data início</th>
                    <th style={{ padding: 8 }}>Data fim</th>
                    <th style={{ padding: 8 }}>Status</th>
                    <th style={{ padding: 8 }}>Observações</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((r) => {
                    const colab = colabByUserId(r.usuario_id);
                    const tarefa = tarefaById(r.tarefa_id);
                    const local = localById(r.local_id);
                    return (
                      <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: 8 }}>
                          {colab?.nome || '—'}
                        </td>
                        <td style={{ padding: 8 }}>
                          {tarefa?.nome || '—'}
                        </td>
                        <td style={{ padding: 8 }}>
                          {local?.nome || '—'}
                        </td>
                        <td style={{ padding: 8 }}>
                          {r.data_dia ? new Date(r.data_dia).toLocaleDateString() : '—'}
                        </td>
                        <td style={{ padding: 8 }}>
                          {r.data_fim ? new Date(r.data_fim).toLocaleDateString() : '—'}
                        </td>
                        <td style={{ padding: 8, textTransform: 'capitalize' }}>
                          {r.status || '—'}
                        </td>
                        <td style={{ padding: 8, maxWidth: 260 }}>
                          {r.observacoes || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {loading && (
            <p className="muted" style={{ marginTop: 8 }}>
              A carregar roteiros…
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
