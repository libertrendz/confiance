// app/adm/roteiros/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

type ColabOption = {
  colaborador_id: string;
  usuario_id: string | null;
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
  empresa_id: string;
  usuario_id: string;
  tarefa_id: string;
  local_id: string | null;
  data_dia: string;
  data_fim: string | null;
  status: string;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

export default function RoteirosPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);

  const [colabs, setColabs] = useState<ColabOption[]>([]);
  const [tarefas, setTarefas] = useState<TarefaOption[]>([]);
  const [locais, setLocais] = useState<LocalOption[]>([]);
  const [lista, setLista] = useState<RoteiroRow[]>([]);

  const [loadingOpcoes, setLoadingOpcoes] = useState(false);
  const [loadingLista, setLoadingLista] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [form, setForm] = useState<{
    usuario_id: string;
    tarefa_id: string;
    local_id: string;
    data_inicio: string;
    data_fim: string;
    observacoes: string;
  }>({
    usuario_id: '',
    tarefa_id: '',
    local_id: '',
    data_inicio: '',
    data_fim: '',
    observacoes: '',
  });

  async function loadOpcoes() {
    setLoadingOpcoes(true);
    setErr(null);
    try {
      // COLABORADORES – direto da tabela colaboradores
      const { data: colabData, error: colabErr } = await supa
        .from('colaboradores')
        .select('id, nome, user_id')
        .order('nome', { ascending: true });

      if (colabErr) throw colabErr;

      const colabOptions: ColabOption[] =
        (colabData || []).map((c: any) => ({
          colaborador_id: c.id,
          usuario_id: c.user_id ?? null,
          nome: c.nome || '—',
        }));

      setColabs(colabOptions);

      // TAREFAS – tabela tarefas_padrao
      const { data: tarefaData, error: tarefaErr } = await supa
        .from('tarefas_padrao')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome', { ascending: true });

      if (tarefaErr) throw tarefaErr;

      setTarefas((tarefaData || []) as TarefaOption[]);

      // LOCAIS – tabela locais_permitidos
      const { data: locaisData, error: locaisErr } = await supa
        .from('locais_permitidos')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome', { ascending: true });

      if (locaisErr) throw locaisErr;

      setLocais((locaisData || []) as LocalOption[]);
    } catch (e: any) {
      console.error('Erro ao carregar opções de roteiros', e);
      setErr(e?.message || 'Falha ao carregar opções (colaboradores / tarefas / locais).');
      setColabs([]);
      setTarefas([]);
      setLocais([]);
    } finally {
      setLoadingOpcoes(false);
    }
  }

  async function loadLista() {
    setLoadingLista(true);
    setErr(null);
    try {
      const { data, error } = await supa
        .from('ponto_roteiros')
        .select(
          'id, empresa_id, usuario_id, tarefa_id, local_id, data_dia, data_fim, status, observacoes, created_at, updated_at'
        )
        .order('data_dia', { ascending: false })
        .limit(200);

      if (error) throw error;

      setLista((data || []) as RoteiroRow[]);
    } catch (e: any) {
      console.error('Erro ao carregar ponto_roteiros', e);
      setErr(e?.message || 'Falha ao carregar roteiros.');
      setLista([]);
    } finally {
      setLoadingLista(false);
    }
  }

  useEffect(() => {
    loadOpcoes();
    loadLista();
  }, []);

  async function criarRoteiro(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    setMsg(null);

    try {
      if (!form.usuario_id) throw new Error('Selecione um colaborador.');
      if (!form.tarefa_id) throw new Error('Selecione uma tarefa.');
      if (!form.local_id) throw new Error('Selecione um local de trabalho.');
      if (!form.data_inicio) throw new Error('Informe a data de início.');

      const payload: any = {
        usuario_id: form.usuario_id,
        tarefa_id: form.tarefa_id,
        local_id: form.local_id,
        data_dia: form.data_inicio,
        observacoes: form.observacoes || null,
      };

      if (form.data_fim) {
        payload.data_fim = form.data_fim;
      }

      const { error } = await supa.from('ponto_roteiros').insert(payload);

      if (error) {
        console.error('Erro ao criar roteiro', error);
        throw error;
      }

      setMsg('Roteiro criado com sucesso.');
      // reset básico
      setForm((f) => ({
        ...f,
        tarefa_id: '',
        local_id: '',
        observacoes: '',
      }));
      await loadLista();
    } catch (e: any) {
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
        <button className="btn btn-ghost" onClick={() => { loadOpcoes(); loadLista(); }} disabled={loadingOpcoes || loadingLista}>
          {loadingOpcoes || loadingLista ? 'A carregar…' : 'Recarregar'}
        </button>
      </header>

      {/* FORM NOVO ROTEIRO */}
      <section className="card" style={{ marginBottom: 16 }}>
        <h2 className="h2">Novo roteiro</h2>
        <p className="muted" style={{ marginBottom: 12 }}>
          Defina colaborador, tarefa, período e local de trabalho. Estes dados serão usados no cálculo
          de presença (geo/raio) e para associações de tarefas do dia.
        </p>

        <form
          onSubmit={criarRoteiro}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          {/* COLABORADOR */}
          <div>
            <label className="muted">Colaborador</label>
            <select
              value={form.usuario_id}
              onChange={(e) => setForm((f) => ({ ...f, usuario_id: e.target.value }))}
              style={input}
            >
              <option value="">Selecione…</option>
              {colabs.map((c) => (
                <option key={c.colaborador_id} value={c.usuario_id || ''}>
                  {c.nome}
                  {c.usuario_id ? '' : ' (sem utilizador ligado)'}
                </option>
              ))}
            </select>
          </div>

          {/* TAREFA */}
          <div>
            <label className="muted">Tarefa</label>
            <select
              value={form.tarefa_id}
              onChange={(e) => setForm((f) => ({ ...f, tarefa_id: e.target.value }))}
              style={input}
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
              value={form.local_id}
              onChange={(e) => setForm((f) => ({ ...f, local_id: e.target.value }))}
              style={input}
            >
              <option value="">Selecione…</option>
              {locais.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </select>
          </div>

          {/* DATA INÍCIO */}
          <div>
            <label className="muted">Data início</label>
            <input
              type="date"
              value={form.data_inicio}
              onChange={(e) => setForm((f) => ({ ...f, data_inicio: e.target.value }))}
              style={input}
            />
          </div>

          {/* DATA FIM */}
          <div>
            <label className="muted">Data fim (opcional)</label>
            <input
              type="date"
              value={form.data_fim}
              onChange={(e) => setForm((f) => ({ ...f, data_fim: e.target.value }))}
              style={input}
            />
          </div>

          {/* OBS */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="muted">Observações (opcional)</label>
            <textarea
              value={form.observacoes}
              onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
              style={{ ...input, minHeight: 60, resize: 'vertical' }}
            />
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" type="submit" disabled={saving || loadingOpcoes}>
              {saving ? 'A criar…' : 'Criar roteiro'}
            </button>
          </div>
        </form>

        {err && (
          <p style={{ color: 'crimson', marginTop: 8 }}>
            {err}
          </p>
        )}
        {msg && (
          <p style={{ color: 'green', marginTop: 8 }}>
            {msg}
          </p>
        )}
      </section>

      {/* LISTA DE ROTEIROS */}
      <section className="card">
        <h2 className="h2" style={{ marginBottom: 8 }}>
          Roteiros existentes
        </h2>

        {!lista.length && !loadingLista && <p className="muted">Sem roteiros registados.</p>}

        {!!lista.length && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: 8 }}>Data início</th>
                  <th style={{ padding: 8 }}>Data fim</th>
                  <th style={{ padding: 8 }}>Utilizador (ID)</th>
                  <th style={{ padding: 8 }}>Tarefa</th>
                  <th style={{ padding: 8 }}>Local</th>
                  <th style={{ padding: 8 }}>Status</th>
                  <th style={{ padding: 8 }}>Observações</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: 8 }}>
                      {r.data_dia ? new Date(r.data_dia).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: 8 }}>
                      {r.data_fim ? new Date(r.data_fim).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 12 }}>
                      {r.usuario_id}
                    </td>
                    <td style={{ padding: 8, fontSize: 12 }}>{r.tarefa_id}</td>
                    <td style={{ padding: 8, fontSize: 12 }}>{r.local_id || '—'}</td>
                    <td style={{ padding: 8 }}>{r.status}</td>
                    <td style={{ padding: 8, fontSize: 12 }}>
                      {r.observacoes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {loadingLista && (
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
};