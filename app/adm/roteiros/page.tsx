// app/adm/roteiros/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

type ColaboradorOption = {
  user_id: string; // auth.users / profiles.user_id
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
  local_id: string | null;
  data_dia: string;
  data_fim: string | null;
  status: string;
  local_label: string | null;
  observacoes: string | null;
  created_at: string;
};

type FormState = {
  usuario_id: string;
  tarefa_id: string;
  local_id: string;
  data_inicio: string;
  data_fim: string;
  observacoes: string;
};

export default function RoteirosPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [colabs, setColabs] = useState<ColaboradorOption[]>([]);
  const [tarefas, setTarefas] = useState<TarefaOption[]>([]);
  const [locais, setLocais] = useState<LocalOption[]>([]);
  const [lista, setLista] = useState<RoteiroRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    usuario_id: '',
    tarefa_id: '',
    local_id: '',
    data_inicio: '',
    data_fim: '',
    observacoes: '',
  });

  async function loadAll() {
    setLoading(true);
    setErr(null);
    setMsg(null);

    try {
      // 1) Colaboradores: USAR APENAS user_id + nome
      const { data: colabData, error: colabError } = await supa
        .from('v_colaboradores_perfis')
        .select('user_id, nome_colaborador')
        .order('nome', { ascending: true });

      if (colabError) throw new Error(`Colaboradores: ${colabError.message}`);

      const colabOpts: ColaboradorOption[] = (colabData || []).map((r: any) => ({
        user_id: r.user_id,
        nome: r.nome,
      }));

      setColabs(colabOpts);

      // 2) Tarefas padrão
      const { data: tarefaData, error: tarefaError } = await supa
        .from('tarefas_padrao')
        .select('id, nome, ativo')
        .eq('ativo', true)
        .order('nome', { ascending: true });

      if (tarefaError) throw new Error(`Tarefas: ${tarefaError.message}`);

      const tarefaOpts: TarefaOption[] = (tarefaData || []).map((r: any) => ({
        id: r.id,
        nome: r.nome,
      }));

      setTarefas(tarefaOpts);

      // 3) Locais permitidos
      const { data: locaisData, error: locaisError } = await supa
        .from('locais_permitidos')
        .select('id, nome, ativo')
        .eq('ativo', true)
        .order('nome', { ascending: true });

      if (locaisError) throw new Error(`Locais: ${locaisError.message}`);

      const localOpts: LocalOption[] = (locaisData || []).map((r: any) => ({
        id: r.id,
        nome: r.nome,
      }));

      setLocais(localOpts);

      // 4) Roteiros existentes
      const { data: rotData, error: rotError } = await supa
        .from('ponto_roteiros')
        .select(
          'id, usuario_id, tarefa_id, local_id, data_dia, data_fim, status, local_label, observacoes, created_at'
        )
        .order('data_dia', { ascending: false })
        .limit(200);

      if (rotError) throw new Error(`Roteiros: ${rotError.message}`);

      setLista((rotData as RoteiroRow[]) || []);
    } catch (e: any) {
      console.error('Erro em loadAll roteiros:', e);
      setErr(e?.message || 'Falha ao carregar dados dos roteiros.');
      setLista([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function criarRoteiro(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    setMsg(null);

    try {
      if (!form.usuario_id || !form.tarefa_id || !form.local_id || !form.data_inicio) {
        throw new Error('Preencha colaborador, tarefa, local e data de início.');
      }

      const dataDia = form.data_inicio;
      const dataFim = form.data_fim || form.data_inicio;
      const localLabel = locais.find((l) => l.id === form.local_id)?.nome || null;

      const { error } = await supa.from('ponto_roteiros').insert({
        usuario_id: form.usuario_id,
        tarefa_id: form.tarefa_id,
        local_id: form.local_id,
        data_dia: dataDia,
        data_fim: dataFim,
        local_label: localLabel,
        status: 'planeado',
        observacoes: form.observacoes || null,
      });

      if (error) {
        console.error('Erro ao criar roteiro', error);
        throw new Error(error.message || String(error));
      }

      setMsg('Roteiro criado com sucesso.');
      setForm({
        usuario_id: '',
        tarefa_id: '',
        local_id: '',
        data_inicio: '',
        data_fim: '',
        observacoes: '',
      });

      await loadAll();
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
        <button className="btn btn-ghost" onClick={loadAll} disabled={loading}>
          {loading ? 'A carregar…' : 'Recarregar'}
        </button>
      </header>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2 className="h2">Novo roteiro</h2>
        <p className="muted">
          Defina colaborador, tarefa, período e local de trabalho. Estes dados serão usados
          no cálculo de presença (geo/raio) e para associações de tarefas do dia.
        </p>

        <form
          onSubmit={criarRoteiro}
          style={{
            display: 'grid',
            gap: 12,
            gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
            marginTop: 12,
          }}
        >
          {/* Colaborador */}
          <div>
            <label className="muted">Colaborador</label>
            <select
              value={form.usuario_id}
              onChange={(e) => setForm((f) => ({ ...f, usuario_id: e.target.value }))}
              style={{
                width: '100%',
                padding: 10,
                border: '1px solid var(--border)',
                borderRadius: 10,
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

          {/* Tarefa */}
          <div>
            <label className="muted">Tarefa</label>
            <select
              value={form.tarefa_id}
              onChange={(e) => setForm((f) => ({ ...f, tarefa_id: e.target.value }))}
              style={{
                width: '100%',
                padding: 10,
                border: '1px solid var(--border)',
                borderRadius: 10,
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
                border: '1px solid var(--border)',
                borderRadius: 10,
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
          <div>
            <label className="muted">Data início</label>
            <input
              type="date"
              value={form.data_inicio}
              onChange={(e) => setForm((f) => ({ ...f, data_inicio: e.target.value }))}
              style={{
                width: '100%',
                padding: 10,
                border: '1px solid var(--border)',
                borderRadius: 10,
                background: '#fff',
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
                border: '1px solid var(--border)',
                borderRadius: 10,
                background: '#fff',
              }}
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
              rows={2}
              style={{
                width: '100%',
                padding: 10,
                border: '1px solid var(--border)',
                borderRadius: 10,
                background: '#fff',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Erros / Mensagens */}
          {err && (
            <div style={{ gridColumn: '1 / -1', color: 'crimson' }}>
              {err}
            </div>
          )}
          {msg && (
            <div style={{ gridColumn: '1 / -1', color: 'green' }}>
              {msg}
            </div>
          )}

          {/* Botão */}
          <div style={{ gridColumn: '1 / -1', textAlign: 'right' }}>
            <button className="btn btn-primary" disabled={saving} type="submit">
              {saving ? 'A criar…' : 'Criar roteiro'}
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <h2 className="h2">Roteiros existentes</h2>
        {!lista.length && !loading && !err && (
          <p className="muted">Sem roteiros registados.</p>
        )}

        {!!lista.length && (
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: 8 }}>Data início</th>
                  <th style={{ padding: 8 }}>Data fim</th>
                  <th style={{ padding: 8 }}>Utilizador (ID)</th>
                  <th style={{ padding: 8 }}>Tarefa (ID)</th>
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
                    <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 12 }}>
                      {r.tarefa_id}
                    </td>
                    <td style={{ padding: 8 }}>
                      {r.local_label || (r.local_id ?? '—')}
                    </td>
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

        {loading && (
          <p className="muted" style={{ marginTop: 8 }}>
            A carregar dados…
          </p>
        )}
      </section>
    </main>
  );
}
