'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

type ColaboradorOption = {
  id: string;        // id da tabela colaboradores
  user_id: string;   // id do auth.user / profiles.user_id
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
  data_dia: string;
  data_fim: string | null;
  status: string;
  tarefa_nome: string | null;
  colaborador_nome: string | null;
  local_nome: string | null;
};

export default function RoteirosPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  const [colaboradores, setColaboradores] = useState<ColaboradorOption[]>([]);
  const [tarefas, setTarefas] = useState<TarefaOption[]>([]);
  const [locais, setLocais] = useState<LocalOption[]>([]);
  const [roteiros, setRoteiros] = useState<RoteiroRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState<{
    colaborador_id: string;
    tarefa_id: string;
    local_id: string;
    data_inicio: string;
    data_fim: string;
    observacoes: string;
  }>({
    colaborador_id: '',
    tarefa_id: '',
    local_id: '',
    data_inicio: '',
    data_fim: '',
    observacoes: '',
  });

  // Carrega empresa + opções + lista
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        // 1) Descobre empresa_id do admin logado (do metadata)
        const { data: ud, error: userErr } = await supa.auth.getUser();
        if (userErr) {
          console.error('auth.getUser error', userErr);
          throw new Error('Falha ao obter utilizador atual.');
        }

        const user = ud.user;
        const meta = (user?.user_metadata || {}) as Record<string, any>;
        const empId = (meta.empresa_id as string) ?? null;
        setEmpresaId(empId);

        console.log('[ROTEIROS] empresa_id detectado:', empId);

        // 2) Carregar em paralelo
        const [colabRes, tarefaRes, localRes, roteirosRes] = await Promise.all([
          supa
            .from('v_colaboradores_perfis')
            .select('id, nome, user_id')
            .order('nome', { ascending: true }),
          supa
            .from('tarefas_padrao')
            .select('id, nome')
            .order('nome', { ascending: true }),
          supa
            .from('locais_permitidos')
            .select('id, nome')
            .order('nome', { ascending: true }),
          supa
            .from('ponto_roteiros')
            .select(
              `
              id,
              usuario_id,
              data_dia,
              data_fim,
              status,
              observacoes,
              tarefa:tarefa_id ( nome ),
              local:local_id ( nome ),
              colab:usuario_id ( id )
            `
            )
            .order('data_dia', { ascending: false })
            .limit(100),
        ]);

        console.log('[ROTEIROS] colabRes:', colabRes);
        console.log('[ROTEIROS] tarefaRes:', tarefaRes);
        console.log('[ROTEIROS] localRes:', localRes);
        console.log('[ROTEIROS] roteirosRes:', roteirosRes);

        if (!alive) return;

        if (colabRes.error) throw colabRes.error;
        if (tarefaRes.error) throw tarefaRes.error;
        if (localRes.error) throw localRes.error;
        if (roteirosRes.error) {
          // Não é fatal para os dropdowns, mas loga
          console.warn('Erro ao carregar roteiros:', roteirosRes.error);
        }

        setColaboradores(
          (colabRes.data || []).map((r: any) => ({
            id: r.id,
            user_id: r.user_id,
            nome: r.nome,
          }))
        );

        setTarefas((tarefaRes.data || []).map((t: any) => ({
          id: t.id,
          nome: t.nome,
        })));

        setLocais((localRes.data || []).map((l: any) => ({
          id: l.id,
          nome: l.nome,
        })));

        setRoteiros(
          (roteirosRes.data || []).map((r: any) => ({
            id: r.id,
            usuario_id: r.usuario_id,
            data_dia: r.data_dia,
            data_fim: r.data_fim,
            status: r.status,
            tarefa_nome: r.tarefa?.nome ?? null,
            local_nome: r.local?.nome ?? null,
            colaborador_nome: r.usuario_id ?? null,
          }))
        );
      } catch (e: any) {
        console.error('[ROTEIROS] erro geral ao carregar', e);
        if (alive) setErr(e?.message || 'Falha ao carregar dados.');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [supa]);

  async function criarRoteiro(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    try {
      if (!form.colaborador_id || !form.tarefa_id || !form.local_id || !form.data_inicio) {
        throw new Error('Preencha colaborador, tarefa, local e data início.');
      }

      const colab = colaboradores.find(c => c.id === form.colaborador_id);
      if (!colab) throw new Error('Colaborador inválido.');

      const dataInicioISO = new Date(form.data_inicio).toISOString().slice(0, 10);
      const dataFimISO = form.data_fim
        ? new Date(form.data_fim).toISOString().slice(0, 10)
        : null;

      const { error } = await supa
        .from('ponto_roteiros')
        .insert([{
          usuario_id: colab.user_id,
          tarefa_id: form.tarefa_id,
          local_id: form.local_id,
          data_dia: dataInicioISO,
          data_fim: dataFimISO,
          local_label: null,
          observacoes: form.observacoes || null,
        }]);

      if (error) {
        console.error('[ROTEIROS] erro ao inserir', error);
        throw new Error(error.message || 'Falha ao criar roteiro.');
      }

      alert('Roteiro criado com sucesso.');

      setForm({
        colaborador_id: '',
        tarefa_id: '',
        local_id: '',
        data_inicio: '',
        data_fim: '',
        observacoes: '',
      });

      // reload leve
      location.reload();
    } catch (e: any) {
      setErr(e?.message || 'Falha ao criar roteiro.');
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
        <button
          className="btn btn-ghost"
          onClick={() => location.reload()}
          disabled={loading}
        >
          {loading ? 'A carregar…' : 'Recarregar'}
        </button>
      </header>

      {/* Formulário de novo roteiro */}
      <section className="card" style={{ marginBottom: 16 }}>
        <h2 className="h2">Novo roteiro</h2>
        <p className="muted" style={{ marginTop: 0, marginBottom: 12 }}>
          Defina colaborador, tarefa, período e local de trabalho.
        </p>

        {err && (
          <p style={{ color: 'crimson', marginBottom: 8 }}>
            {err}
          </p>
        )}

        <form
          onSubmit={criarRoteiro}
          style={{
            display: 'grid',
            gap: 10,
            gridTemplateColumns: '1fr 1fr 1fr',
            alignItems: 'flex-start',
          }}
        >
          {/* Colaborador */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label className="muted">Colaborador</label>
            <select
              value={form.colaborador_id}
              onChange={e => setForm(f => ({ ...f, colaborador_id: e.target.value }))}
              style={{ padding: 10, borderRadius: 10, border: '1px solid var(--border)' }}
            >
              <option value="">Selecione…</option>
              {colaboradores.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Tarefa */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label className="muted">Tarefa</label>
            <select
              value={form.tarefa_id}
              onChange={e => setForm(f => ({ ...f, tarefa_id: e.target.value }))}
              style={{ padding: 10, borderRadius: 10, border: '1px solid var(--border)' }}
            >
              <option value="">Selecione…</option>
              {tarefas.map(t => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Local */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label className="muted">Local de trabalho</label>
            <select
              value={form.local_id}
              onChange={e => setForm(f => ({ ...f, local_id: e.target.value }))}
              style={{ padding: 10, borderRadius: 10, border: '1px solid var(--border)' }}
            >
              <option value="">Selecione…</option>
              {locais.map(l => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Datas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label className="muted">Data início</label>
            <input
              type="date"
              value={form.data_inicio}
              onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))}
              style={{ padding: 10, borderRadius: 10, border: '1px solid var(--border)' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label className="muted">Data fim (opcional)</label>
            <input
              type="date"
              value={form.data_fim}
              onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))}
              style={{ padding: 10, borderRadius: 10, border: '1px solid var(--border)' }}
            />
          </div>

          {/* Observações */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label className="muted">Observações (opcional)</label>
            <textarea
              value={form.observacoes}
              onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
              rows={3}
              style={{ padding: 10, borderRadius: 10, border: '1px solid var(--border)', resize: 'vertical' }}
            />
          </div>

          {/* Botão */}
          <div style={{ gridColumn: '1 / -1', marginTop: 8 }}>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              Criar roteiro
            </button>
          </div>
        </form>
      </section>

      {/* Lista de roteiros */}
      <section className="card">
        <h2 className="h2">Roteiros existentes</h2>

        {!roteiros.length && !loading && (
          <p className="muted">Sem roteiros registados.</p>
        )}

        {!!roteiros.length && (
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: 8 }}>Data</th>
                  <th style={{ padding: 8 }}>Colaborador</th>
                  <th style={{ padding: 8 }}>Tarefa</th>
                  <th style={{ padding: 8 }}>Local</th>
                  <th style={{ padding: 8 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {roteiros.map(r => (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: 8 }}>
                      {r.data_dia ? new Date(r.data_dia).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: 8 }}>{r.colaborador_nome || r.usuario_id || '—'}</td>
                    <td style={{ padding: 8 }}>{r.tarefa_nome || '—'}</td>
                    <td style={{ padding: 8 }}>{r.local_nome || '—'}</td>
                    <td style={{ padding: 8, textTransform: 'capitalize' }}>{r.status || '—'}</td>
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
