// app/adm/roteiros/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

type ColaboradorOption = {
  user_id: string;
  nome: string | null;
};

type TarefaOption = {
  id: string;
  nome: string;
};

type LocalOption = {
  id: string;
  nome: string;
  lat: number;
  lng: number;
  radius_m: number;
};

type RoteiroRow = {
  id: string;
  usuario_id: string;
  data_dia: string;
  data_fim: string | null;
  status: string | null;
  local_label: string | null;
  local_id: string | null;
  observacoes: string | null;
  tarefa_id: string;
  tarefas_padrao?: { nome: string }[] | null;
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

  const [colabs, setColabs] = useState<ColaboradorOption[]>([]);
  const [tarefas, setTarefas] = useState<TarefaOption[]>([]);
  const [locais, setLocais] = useState<LocalOption[]>([]);
  const [lista, setLista] = useState<RoteiroRow[]>([]);

  const [form, setForm] = useState<FormState>({
    usuario_id: '',
    tarefa_id: '',
    local_id: '',
    data_dia: '',
    data_fim: '',
    observacoes: '',
  });

  const [loading, setLoading] = useState(false);
  const [loadingLista, setLoadingLista] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Carrega colaboradores / tarefas / locais
  async function loadContext() {
    setErr(null);
    setMsg(null);
    setLoading(true);
    try {
      const [colabRes, tarefaRes, localRes] = await Promise.all([
        // Tira direto da tabela "colaboradores"
        supa
          .from('colaboradores')
          .select('user_id, nome')
          .not('user_id', 'is', null),
        supa
          .from('tarefas_padrao')
          .select('id, nome')
          .eq('ativo', true),
        supa
          .from('locais_permitidos')
          .select('id, nome, lat, lng, radius_m')
          .eq('ativo', true),
      ]);

      if (colabRes.error) throw colabRes.error;
      if (tarefaRes.error) throw tarefaRes.error;
      if (localRes.error) throw localRes.error;

      setColabs((colabRes.data || []) as ColaboradorOption[]);
      setTarefas((tarefaRes.data || []) as TarefaOption[]);
      setLocais((localRes.data || []) as LocalOption[]);
    } catch (e: any) {
      console.error('Erro ao carregar contexto de roteiros', e);
      setErr(e?.message || 'Falha ao carregar opções de colaboradores/tarefas/locais.');
    } finally {
      setLoading(false);
    }
  }

  // Carrega lista de roteiros
  async function loadLista() {
    setLoadingLista(true);
    setErr(null);
    try {
      const { data, error } = await supa
        .from('ponto_roteiros')
        .select(
          'id, usuario_id, data_dia, data_fim, status, local_label, local_id, observacoes, tarefa_id, tarefas_padrao(nome)'
        )
        .order('data_dia', { ascending: true })
        .limit(200);

      if (error) throw error;
      setLista((data || []) as unknown as RoteiroRow[]);
    } catch (e: any) {
      console.error('Erro ao carregar ponto_roteiros', e);
      setErr(e?.message || 'Falha ao carregar roteiros.');
      setLista([]);
    } finally {
      setLoadingLista(false);
    }
  }

  useEffect(() => {
    loadContext();
    loadLista();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function criarRoteiro(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    setMsg(null);

    try {
      if (!form.usuario_id) throw new Error('Selecione um colaborador.');
      if (!form.tarefa_id) throw new Error('Selecione uma tarefa.');
      if (!form.data_dia) throw new Error('Selecione a data inicial.');

      const local = locais.find((l) => l.id === form.local_id) || null;
      const localLabel = local ? local.nome : null;

      const payload: any = {
        usuario_id: form.usuario_id,
        tarefa_id: form.tarefa_id,
        data_dia: form.data_dia,
        status: 'planeado',
        observacoes: form.observacoes || null,
        local_id: form.local_id || null,
        local_label: localLabel,
      };

      if (form.data_fim) {
        payload.data_fim = form.data_fim;
      }

      const { error } = await supa.from('ponto_roteiros').insert(payload);
      if (error) throw error;

      setMsg('Roteiro criado com sucesso.');
      setForm({
        usuario_id: '',
        tarefa_id: '',
        local_id: '',
        data_dia: '',
        data_fim: '',
        observacoes: '',
      });

      await loadLista();
    } catch (e: any) {
      console.error('Erro ao criar roteiro', e);
      setErr(e?.message || 'Falha ao criar roteiro.');
    } finally {
      setSaving(false);
    }
  }

  function labelColab(c: ColaboradorOption) {
    return c.nome || c.user_id;
  }

  function nomeTarefa(r: RoteiroRow) {
    const rel = r.tarefas_padrao && r.tarefas_padrao[0];
    if (rel?.nome) return rel.nome;
    const t = tarefas.find((t) => t.id === r.tarefa_id);
    return t?.nome || '—';
  }

  function nomeLocal(r: RoteiroRow) {
    if (r.local_label) return r.local_label;
    if (r.local_id) {
      const l = locais.find((l) => l.id === r.local_id);
      if (l) return l.nome;
    }
    return '—';
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
        <button className="btn btn-ghost" onClick={loadLista} disabled={loadingLista}>
          {loadingLista ? 'A carregar…' : 'Recarregar'}
        </button>
      </header>

      {/* NOVO ROTEIRO */}
      <section className="card" style={{ marginBottom: 16 }}>
        <h2 className="h2" style={{ marginBottom: 8 }}>
          Novo roteiro
        </h2>
        <p className="muted" style={{ marginBottom: 12 }}>
          Defina colaborador, tarefa, período e local de trabalho. Estes dados serão usados no cálculo de
          presença (geo/raio) e para associações de tarefas do dia.
        </p>

        <form
          onSubmit={criarRoteiro}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          <div>
            <label className="muted">Colaborador</label>
            <select
              value={form.usuario_id}
              onChange={(e) => onChange('usuario_id', e.target.value)}
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
                  {labelColab(c)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="muted">Tarefa</label>
            <select
              value={form.tarefa_id}
              onChange={(e) => onChange('tarefa_id', e.target.value)}
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

          <div>
            <label className="muted">Local de trabalho</label>
            <select
              value={form.local_id}
              onChange={(e) => onChange('local_id', e.target.value)}
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

          <div>
            <label className="muted">Data início</label>
            <input
              type="date"
              value={form.data_dia}
              onChange={(e) => onChange('data_dia', e.target.value)}
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
              value={form.data_fim}
              onChange={(e) => onChange('data_fim', e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: '#fff',
              }}
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label className="muted">Observações (opcional)</label>
            <textarea
              value={form.observacoes}
              onChange={(e) => onChange('observacoes', e.target.value)}
              rows={2}
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

          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, marginTop: 4 }}>
            <button className="btn btn-primary" type="submit" disabled={saving || loading}>
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

      {/* LISTA DE ROTEIROS EXISTENTES */}
      <section className="card">
        <h2 className="h2" style={{ marginBottom: 8 }}>
          Roteiros existentes
        </h2>

        {!lista.length && !loadingLista && <p className="muted">Sem roteiros registados.</p>}

        {!!lista.length && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: 8 }}>Colaborador</th>
                  <th style={{ padding: 8 }}>Tarefa</th>
                  <th style={{ padding: 8 }}>Local</th>
                  <th style={{ padding: 8 }}>Data início</th>
                  <th style={{ padding: 8 }}>Data fim</th>
                  <th style={{ padding: 8 }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((r) => {
                  const colab = colabs.find((c) => c.user_id === r.usuario_id);
                  return (
                    <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: 8 }}>
                        {colab ? labelColab(colab) : r.usuario_id}
                      </td>
                      <td style={{ padding: 8 }}>{nomeTarefa(r)}</td>
                      <td style={{ padding: 8 }}>{nomeLocal(r)}</td>
                      <td style={{ padding: 8 }}>
                        {r.data_dia ? new Date(r.data_dia).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ padding: 8 }}>
                        {r.data_fim ? new Date(r.data_fim).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ padding: 8 }}>{r.status || 'planeado'}</td>
                    </tr>
                  );
                })}
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
