'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

type ColabRow = {
  id: string;
  nome: string | null;
  user_id: string | null;
};

type TarefaRow = {
  id: string;
  nome: string | null;
};

type LocalRow = {
  id: string;
  nome: string | null;
};

type RoteiroRow = {
  id: string;
  usuario_id: string;
  tarefa_id: string;
  data_dia: string;
  data_fim: string | null;
  status: string;
  observacoes: string | null;
  local_id: string | null;
  local_label: string | null;
};

type FormState = {
  usuarioId: string;
  tarefaId: string;
  localId: string;
  dataInicio: string;
  dataFim: string;
  observacoes: string;
};

const emptyForm: FormState = {
  usuarioId: '',
  tarefaId: '',
  localId: '',
  dataInicio: '',
  dataFim: '',
  observacoes: '',
};

export default function RoteirosPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);

  const [colabs, setColabs] = useState<ColabRow[]>([]);
  const [tarefas, setTarefas] = useState<TarefaRow[]>([]);
  const [locais, setLocais] = useState<LocalRow[]>([]);
  const [lista, setLista] = useState<RoteiroRow[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // map user_id -> nome, para exibir na tabela
  const colabNomeByUserId = useMemo(() => {
    const m = new Map<string, string>();
    colabs.forEach((c) => {
      if (c.user_id) {
        m.set(c.user_id, c.nome || '');
      }
    });
    return m;
  }, [colabs]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      // 1) colaboradores (view v_colaboradores_perfis)
      {
        const { data, error } = await supa
          .from('v_colaboradores_perfis')
          .select('id, nome, user_id')
          .order('nome', { ascending: true });

        if (error) throw error;
        setColabs((data as ColabRow[]) || []);
      }

      // 2) tarefas padrão ativas
      {
        const { data, error } = await supa
          .from('tarefas_padrao')
          .select('id, nome, ativo')
          .eq('ativo', true)
          .order('nome', { ascending: true });

        if (error) throw error;
        setTarefas((data as TarefaRow[]) || []);
      }

      // 3) locais permitidos ativos
      {
        const { data, error } = await supa
          .from('locais_permitidos')
          .select('id, nome, ativo')
          .eq('ativo', true)
          .order('nome', { ascending: true });

        if (error) throw error;
        setLocais((data as LocalRow[]) || []);
      }

      // 4) roteiros existentes
      {
        const { data, error } = await supa
          .from('ponto_roteiros')
          .select(
            'id, usuario_id, tarefa_id, data_dia, data_fim, status, observacoes, local_id, local_label'
          )
          .order('data_dia', { ascending: false })
          .limit(100);

        if (error) throw error;
        setLista((data as RoteiroRow[]) || []);
      }
    } catch (e: any) {
      console.error('Erro ao carregar roteiros', e);
      setErr(e?.message || 'Falha ao carregar roteiros.');
      setColabs([]);
      setTarefas([]);
      setLocais([]);
      setLista([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function criarRoteiro(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!form.usuarioId || !form.tarefaId || !form.dataInicio) {
      setErr('Preencha colaborador, tarefa e data de início.');
      return;
    }

    setSaving(true);
    try {
      const dtIni = form.dataInicio;
      const dtFim = form.dataFim || form.dataInicio;

      const start = new Date(dtIni);
      const end = new Date(dtFim);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('Datas inválidas.');
      }
      if (end < start) {
        throw new Error('Data fim não pode ser anterior à data início.');
      }

      // gera lista de dias [yyyy-mm-dd]
      const dias: string[] = [];
      const cursor = new Date(start.getTime());
      while (cursor <= end) {
        const iso = cursor.toISOString().slice(0, 10);
        dias.push(iso);
        cursor.setDate(cursor.getDate() + 1);
      }

      const localEscolhido = locais.find((l) => l.id === form.localId) || null;

      const rowsToInsert = dias.map((d) => ({
        usuario_id: form.usuarioId,
        tarefa_id: form.tarefaId,
        data_dia: d,
        data_fim: dtFim || null,
        local_id: form.localId || null,
        local_label: localEscolhido?.nome || null,
        status: 'planeado',
        observacoes: form.observacoes || null,
      }));

      const { error } = await supa.from('ponto_roteiros').insert(rowsToInsert);
      if (error) throw error;

      setForm(emptyForm);
      await load();
      alert('Roteiro criado com sucesso.');
    } catch (e: any) {
      console.error('Erro ao criar roteiro', e);
      setErr(e?.message || 'Falha ao criar roteiro.');
    } finally {
      setSaving(false);
    }
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
        <button className="btn btn-ghost" onClick={load} disabled={loading}>
          {loading ? 'A carregar…' : 'Recarregar'}
        </button>
      </header>

      <section
        className="card"
        style={{ marginBottom: 18, display: 'grid', gap: 12 }}
      >
        <p className="muted" style={{ margin: 0 }}>
          Defina colaborador, tarefa, período e local de trabalho. Estes dados
          serão usados no cálculo de presença (geolocalização/raio) e para
          associações de tarefas do dia.
        </p>

        <form
          onSubmit={criarRoteiro}
          style={{
            display: 'grid',
            gap: 12,
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            alignItems: 'flex-end',
          }}
        >
          {/* Colaborador */}
          <div>
            <label className="muted">Colaborador</label>
            <select
              value={form.usuarioId}
              onChange={(e) =>
                setForm((f) => ({ ...f, usuarioId: e.target.value }))
              }
              style={input}
              required
            >
              <option value="">Selecione…</option>
              {colabs.map((c) => (
                <option key={c.id} value={c.user_id || ''}>
                  {c.nome || '—'}
                </option>
              ))}
            </select>
          </div>

          {/* Tarefa */}
          <div>
            <label className="muted">Tarefa</label>
            <select
              value={form.tarefaId}
              onChange={(e) =>
                setForm((f) => ({ ...f, tarefaId: e.target.value }))
              }
              style={input}
              required
            >
              <option value="">Selecione…</option>
              {tarefas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome || '—'}
                </option>
              ))}
            </select>
          </div>

          {/* Local */}
          <div>
            <label className="muted">Local de trabalho</label>
            <select
              value={form.localId}
              onChange={(e) =>
                setForm((f) => ({ ...f, localId: e.target.value }))
              }
              style={input}
            >
              <option value="">Selecione…</option>
              {locais.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome || '—'}
                </option>
              ))}
            </select>
          </div>

          {/* Datas */}
          <div>
            <label className="muted">Data início</label>
            <input
              type="date"
              value={form.dataInicio}
              onChange={(e) =>
                setForm((f) => ({ ...f, dataInicio: e.target.value }))
              }
              style={input}
              required
            />
          </div>
          <div>
            <label className="muted">Data fim (opcional)</label>
            <input
              type="date"
              value={form.dataFim}
              onChange={(e) =>
                setForm((f) => ({ ...f, dataFim: e.target.value }))
              }
              style={input}
            />
          </div>

          {/* Observações */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="muted">Observações (opcional)</label>
            <textarea
              value={form.observacoes}
              onChange={(e) =>
                setForm((f) => ({ ...f, observacoes: e.target.value }))
              }
              style={{ ...input, minHeight: 60, resize: 'vertical' }}
            />
          </div>

          {err && (
            <p style={{ color: 'crimson', gridColumn: '1 / -1' }}>{err}</p>
          )}

          <div style={{ gridColumn: '1 / -1', textAlign: 'right' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'A criar…' : 'Criar roteiro'}
            </button>
          </div>
        </form>
      </section>

      {/* Lista de roteiros existentes */}
      <section className="card">
        <h2 className="h2" style={{ marginTop: 0 }}>
          Roteiros existentes
        </h2>

        {!lista.length && !loading && (
          <p className="muted">Sem roteiros registados.</p>
        )}

        {!!lista.length && (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 13,
              }}
            >
              <thead>
                <tr
                  style={{
                    textAlign: 'left',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
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
                  const nomeColab =
                    colabNomeByUserId.get(r.usuario_id) || r.usuario_id;
                  const tarefa = tarefas.find((t) => t.id === r.tarefa_id);
                  const local =
                    locais.find((l) => l.id === r.local_id) || null;

                  return (
                    <tr
                      key={r.id}
                      style={{ borderTop: '1px solid var(--border)' }}
                    >
                      <td style={{ padding: 8 }}>{nomeColab}</td>
                      <td style={{ padding: 8 }}>
                        {tarefa?.nome || r.tarefa_id}
                      </td>
                      <td style={{ padding: 8 }}>
                        {local?.nome || r.local_label || '—'}
                      </td>
                      <td style={{ padding: 8 }}>
                        {r.data_dia
                          ? new Date(r.data_dia).toLocaleDateString()
                          : '—'}
                      </td>
                      <td style={{ padding: 8 }}>
                        {r.data_fim
                          ? new Date(r.data_fim).toLocaleDateString()
                          : '—'}
                      </td>
                      <td style={{ padding: 8 }}>{r.status || '—'}</td>
                      <td style={{ padding: 8 }}>
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
      </section>
    </main>
  );
}

const input: React.CSSProperties = {
  width: '100%',
  padding: 10,
  border: '1px solid var(--border)',
  borderRadius: 10,
  background: '#fff',
  fontSize: 13,
};
