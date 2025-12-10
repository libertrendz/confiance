// app/adm/roteiros/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

type Colab = {
  usuario_id: string;
  nome?: string | null;
  nome_exibicao?: string | null;
  email?: string | null;
};

type TarefaPadrao = {
  id: string;
  nome: string;
  ativo?: boolean | null;
};

type LocalPermitido = {
  id: string;
  nome: string;
  radius_m?: number | null;
  ativo?: boolean | null;
  empresa_id?: string | null;
};

type RoteiroRow = {
  id: string;
  empresa_id: string | null;
  usuario_id: string;
  tarefa_id: string | null;
  local_id: string | null;
  local_label: string | null;
  data_dia: string | null;
  data_fim: string | null;
  status: string | null;
  observacoes: string | null;
  created_at: string | null;
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

  const [empresaId, setEmpresaId] = useState<string | null>(null);

  const [colabs, setColabs] = useState<Colab[]>([]);
  const [tarefas, setTarefas] = useState<TarefaPadrao[]>([]);
  const [locais, setLocais] = useState<LocalPermitido[]>([]);
  const [lista, setLista] = useState<RoteiroRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const todayIso = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState<FormState>({
    usuario_id: '',
    tarefa_id: '',
    local_id: '',
    data_dia: todayIso,
    data_fim: todayIso,
    observacoes: '',
  });

  // Carrega empresa do utilizador (via profiles)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: ud } = await supa.auth.getUser();
        const uid = ud.user?.id;
        if (!uid) return;

        const { data: prof, error } = await supa
          .from('profiles')
          .select('empresa_id')
          .eq('user_id', uid)
          .maybeSingle();

        if (error) {
          console.warn('Erro ao obter empresa_id do profile', error);
          return;
        }
        if (!alive) return;
        if (prof?.empresa_id) {
          setEmpresaId(prof.empresa_id as string);
        }
      } catch (e) {
        console.warn('Falha ao carregar empresa_id', e);
      }
    })();

    return () => {
      alive = false;
    };
  }, [supa]);

  async function loadAll() {
    setLoading(true);
    setErr(null);
    setMsg(null);
    try {
      const [
        { data: colabData, error: colabErr },
        { data: tarefaData, error: tarefaErr },
        { data: localData, error: localErr },
        { data: roteirosData, error: roteirosErr },
      ] = await Promise.all([
        supa.from('v_colaboradores_perfis').select('*'),
        supa.from('tarefas_padrao').select('*'),
        supa.from('locais_permitidos').select('*'),
        supa
          .from('ponto_roteiros')
          .select('*')
          .order('data_dia', { ascending: false })
          .limit(200),
      ]);

      if (colabErr) throw colabErr;
      if (tarefaErr) throw tarefaErr;
      if (localErr) throw localErr;
      if (roteirosErr) throw roteirosErr;

      setColabs((colabData as Colab[]) || []);
      setTarefas(((tarefaData || []) as any as TarefaPadrao[]).filter(t => t.nome));
      setLocais(((localData || []) as any as LocalPermitido[]).filter(l => l.nome));
      setLista(((roteirosData || []) as any as RoteiroRow[]));
    } catch (e: any) {
      console.error('Erro ao carregar ponto_roteiros / auxiliares', e);
      setErr(e?.message || 'Falha ao carregar roteiros.');
      setLista([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function displayColab(usuario_id: string): string {
    const c = colabs.find((x) => x.usuario_id === usuario_id);
    if (!c) return usuario_id;
    return (
      c.nome_exibicao ||
      c.nome ||
      c.email ||
      usuario_id
    );
  }

  function displayTarefa(tarefa_id: string | null): string {
    if (!tarefa_id) return '—';
    const t = tarefas.find((x) => x.id === tarefa_id);
    return t?.nome || tarefa_id;
  }

  function displayLocal(local_id: string | null, fallbackLabel: string | null): string {
    if (!local_id && fallbackLabel) return fallbackLabel;
    if (!local_id) return '—';
    const l = locais.find((x) => x.id === local_id);
    return l?.nome || fallbackLabel || local_id;
  }

  async function onCriar(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    if (!empresaId) {
      setErr('Não foi possível determinar a empresa do utilizador.');
      return;
    }
    if (!form.usuario_id) {
      setErr('Selecione um colaborador.');
      return;
    }
    if (!form.tarefa_id) {
      setErr('Selecione uma tarefa.');
      return;
    }
    if (!form.local_id) {
      setErr('Selecione um local de trabalho.');
      return;
    }
    if (!form.data_dia) {
      setErr('Selecione a data inicial.');
      return;
    }

    setSaving(true);
    try {
      const local = locais.find((l) => l.id === form.local_id) || null;

      const payload = {
        empresa_id: empresaId,
        usuario_id: form.usuario_id,
        tarefa_id: form.tarefa_id,
        local_id: form.local_id,
        local_label: local?.nome ?? null,
        data_dia: form.data_dia,
        data_fim: form.data_fim || form.data_dia,
        status: 'planeado',
        observacoes: form.observacoes || null,
      };

      const { data, error } = await supa
        .from('ponto_roteiros')
        .insert([payload])
        .select('*')
        .maybeSingle();

      if (error) throw error;

      setMsg('Roteiro criado com sucesso.');
      setForm((f) => ({
        ...f,
        tarefa_id: '',
        local_id: '',
        observacoes: '',
      }));

      if (data) {
        setLista((prev) => [data as RoteiroRow, ...(prev || [])]);
      } else {
        await loadAll();
      }
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
        <button className="btn btn-ghost" onClick={loadAll} disabled={loading}>
          {loading ? 'A carregar…' : 'Recarregar'}
        </button>
      </header>

      {/* CRIAR ROTEIRO */}
      <section className="card" style={{ marginBottom: 16 }}>
        <h2 className="h2" style={{ marginBottom: 8 }}>
          Novo roteiro
        </h2>
        <p className="muted" style={{ marginBottom: 12, fontSize: 13 }}>
          Defina colaborador, tarefa, período e local de trabalho. Estes dados serão usados para validar o ponto
          (raio de localização) e ligar a marcação às tarefas do dia.
        </p>

        <form
          onSubmit={onCriar}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
            alignItems: 'flex-end',
          }}
        >
          {/* COLABORADOR */}
          <div>
            <label className="muted" style={{ fontSize: 12 }}>
              Colaborador
            </label>
            <select
              value={form.usuario_id}
              onChange={(e) => updateForm('usuario_id', e.target.value)}
              required
              style={inputStyle}
            >
              <option value="">Selecione…</option>
              {colabs.map((c) => (
                <option key={c.usuario_id} value={c.usuario_id}>
                  {displayColab(c.usuario_id)}
                </option>
              ))}
            </select>
          </div>

          {/* TAREFA */}
          <div>
            <label className="muted" style={{ fontSize: 12 }}>
              Tarefa
            </label>
            <select
              value={form.tarefa_id}
              onChange={(e) => updateForm('tarefa_id', e.target.value)}
              required
              style={inputStyle}
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
            <label className="muted" style={{ fontSize: 12 }}>
              Local de trabalho
            </label>
            <select
              value={form.local_id}
              onChange={(e) => updateForm('local_id', e.target.value)}
              required
              style={inputStyle}
            >
              <option value="">Selecione…</option>
              {locais.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome} {l.radius_m ? `(${l.radius_m} m)` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* DATA INÍCIO */}
          <div>
            <label className="muted" style={{ fontSize: 12 }}>
              Data início
            </label>
            <input
              type="date"
              value={form.data_dia}
              onChange={(e) => updateForm('data_dia', e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {/* DATA FIM */}
          <div>
            <label className="muted" style={{ fontSize: 12 }}>
              Data fim
            </label>
            <input
              type="date"
              value={form.data_fim}
              onChange={(e) => updateForm('data_fim', e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* OBSERVAÇÕES */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="muted" style={{ fontSize: 12 }}>
              Observações (opcional)
            </label>
            <textarea
              value={form.observacoes}
              onChange={(e) => updateForm('observacoes', e.target.value)}
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {/* BOTÕES / ERROS */}
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={saving || !empresaId}
            >
              {saving ? 'A guardar…' : 'Guardar roteiro'}
            </button>
            {err && (
              <span style={{ color: 'crimson', fontSize: 13 }}>
                {err}
              </span>
            )}
            {msg && (
              <span style={{ color: 'green', fontSize: 13 }}>
                {msg}
              </span>
            )}
          </div>
        </form>
      </section>

      {/* LISTA DE ROTEIROS */}
      <section className="card">
        <h2 className="h2" style={{ marginBottom: 8 }}>
          Roteiros existentes
        </h2>

        {!lista?.length && !loading && !err && (
          <p className="muted">Sem roteiros registados.</p>
        )}

        {!!lista?.length && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: 8 }}>Colaborador</th>
                  <th style={{ padding: 8 }}>Tarefa</th>
                  <th style={{ padding: 8 }}>Local</th>
                  <th style={{ padding: 8 }}>Período</th>
                  <th style={{ padding: 8 }}>Estado</th>
                  <th style={{ padding: 8 }}>Observações</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: 8 }}>
                      {displayColab(r.usuario_id)}
                    </td>
                    <td style={{ padding: 8 }}>
                      {displayTarefa(r.tarefa_id)}
                    </td>
                    <td style={{ padding: 8 }}>
                      {displayLocal(r.local_id, r.local_label)}
                    </td>
                    <td style={{ padding: 8, whiteSpace: 'nowrap' }}>
                      {r.data_dia || '—'}
                      {r.data_fim && r.data_fim !== r.data_dia
                        ? ` → ${r.data_fim}`
                        : ''}
                    </td>
                    <td style={{ padding: 8, textTransform: 'capitalize' }}>
                      {r.status || '—'}
                    </td>
                    <td style={{ padding: 8, maxWidth: 260 }}>
                      <span
                        style={{
                          display: 'inline-block',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '100%',
                        }}
                        title={r.observacoes ?? undefined}
                      >
                        {r.observacoes || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
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

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 10,
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: '#fff',
  fontSize: 13,
};
