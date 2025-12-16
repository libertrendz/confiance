// app/adm/roteiros/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

type Option = { id: string; nome: string };

type RoteiroRow = {
  id: string;
  usuario_id: string;
  data_dia: string;
  data_fim: string | null;
  status: string;
  local_label: string | null;
  observacoes: string | null;
  tarefa_id: string;
  tarefa_nome: string | null;
  local_nome: string | null;
};

export default function RoteirosPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);

  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [loadingEmpresa, setLoadingEmpresa] = useState(true);

  const [colabOpts, setColabOpts] = useState<Option[]>([]);
  const [tarefaOpts, setTarefaOpts] = useState<Option[]>([]);
  const [localOpts, setLocalOpts] = useState<Option[]>([]);
  const [lista, setLista] = useState<RoteiroRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const colabNomePorId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of colabOpts) map[c.id] = c.nome;
    return map;
  }, [colabOpts]);

  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState<{
    usuario_id: string;
    tarefa_id: string;
    local_id: string;
    data_dia: string;
    data_fim: string;
    observacoes: string;
  }>({
    usuario_id: '',
    tarefa_id: '',
    local_id: '',
    data_dia: '',
    data_fim: '',
    observacoes: '',
  });

  async function loadEmpresa() {
    setLoadingEmpresa(true);
    setErr(null);

    try {
      const { data: ud, error: uerr } = await supa.auth.getUser();
      if (uerr) throw uerr;

      const uid = ud.user?.id ?? null;
      if (!uid) {
        setEmpresaId(null);
        setErr('Sessão expirada. Faça login novamente.');
        return;
      }

      const { data: prof, error: perr } = await supa
        .from('profiles')
        .select('empresa_id')
        .eq('user_id', uid)
        .maybeSingle();

      if (perr) throw perr;

      const eid = (prof as any)?.empresa_id ?? null;
      if (!eid) {
        setEmpresaId(null);
        setErr('Não foi possível identificar a empresa do utilizador (profiles.empresa_id).');
        return;
      }

      setEmpresaId(eid);
    } catch (e: any) {
      console.error('Erro ao carregar empresa do utilizador', e);
      setEmpresaId(null);
      setErr(e?.message || 'Falha ao carregar empresa do utilizador.');
    } finally {
      setLoadingEmpresa(false);
    }
  }

  async function loadOptions(eid: string) {
    setErr(null);
    try {
      // 1) Colaboradores (view DEFINITIVA)
      const { data: colabs, error: colabErr } = await supa
        .from('v_adm_colaboradores')
        .select('user_id, nome_exibicao, papel')
        .eq('papel', 'externo')
        .order('nome_exibicao', { ascending: true });

      if (colabErr) throw colabErr;

      setColabOpts(
        (colabs || []).map((c: any) => ({
          id: c.user_id,
          nome: c.nome_exibicao,
        }))
      );

      // 2) Tarefas padrão
      const { data: tarefas, error: tarefaErr } = await supa
        .from('tarefas_padrao')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome', { ascending: true });

      if (tarefaErr) throw tarefaErr;
      setTarefaOpts((tarefas || []) as Option[]);

      // 3) Locais permitidos (FILTRADO POR EMPRESA)
      const { data: locais, error: localErr } = await supa
        .from('locais_permitidos')
        .select('id, nome')
        .eq('empresa_id', eid)
        .eq('ativo', true)
        .order('nome', { ascending: true });

      if (localErr) throw localErr;
      setLocalOpts((locais || []) as Option[]);
    } catch (e: any) {
      console.error('Erro ao carregar opções de roteiros', e);
      setErr(e?.message || 'Falha ao carregar opções de roteiros.');
    }
  }

  async function loadLista(eid: string) {
    setLoading(true);
    setErr(null);
    try {
      const { data, error } = await supa
        .from('ponto_roteiros')
        .select(
          `
          id,
          usuario_id,
          data_dia,
          data_fim,
          status,
          local_label,
          observacoes,
          tarefa_id,
          tarefas_padrao!inner ( nome ),
          locais_permitidos ( nome )
        `
        )
        .eq('empresa_id', eid)
        .order('data_dia', { ascending: false })
        .limit(200);

      if (error) throw error;

      const mapped: RoteiroRow[] = (data || []).map((r: any) => ({
        id: r.id,
        usuario_id: r.usuario_id,
        data_dia: r.data_dia,
        data_fim: r.data_fim,
        status: r.status,
        local_label: r.local_label,
        observacoes: r.observacoes,
        tarefa_id: r.tarefa_id,
        tarefa_nome: r.tarefas_padrao?.nome ?? null,
        local_nome: r.locais_permitidos?.nome ?? null,
      }));

      setLista(mapped);
    } catch (e: any) {
      console.error('Erro ao carregar ponto_roteiros', e);
      setErr(e?.message || 'Falha ao carregar roteiros.');
      setLista([]);
    } finally {
      setLoading(false);
    }
  }

  async function criarRoteiro(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (loadingEmpresa) {
      setErr('A aguardar identificação da empresa…');
      return;
    }

    if (!empresaId) {
      setErr('Empresa não identificada. Faça login novamente.');
      return;
    }

    if (!form.usuario_id || !form.tarefa_id || !form.local_id || !form.data_dia) {
      setErr('Preencha colaborador, tarefa, local e data início.');
      return;
    }

    setSalvando(true);
    try {
      const payload: any = {
        empresa_id: empresaId, // ✅ CRÍTICO: sem isso o SELECT/VIEW do colaborador não encontra
        usuario_id: form.usuario_id,
        tarefa_id: form.tarefa_id,
        local_id: form.local_id,
        data_dia: form.data_dia,
        status: 'planeado',
        observacoes: form.observacoes || null,
      };

      if (form.data_fim) {
        payload.data_fim = form.data_fim;
      }

      const { error } = await supa.from('ponto_roteiros').insert(payload);
      if (error) throw error;

      setForm({
        usuario_id: '',
        tarefa_id: '',
        local_id: '',
        data_dia: '',
        data_fim: '',
        observacoes: '',
      });

      await loadLista(empresaId);
      alert('Roteiro criado com sucesso.');
    } catch (e: any) {
      console.error('Erro ao criar roteiro', e);
      setErr(e?.message || 'Falha ao criar roteiro.');
    } finally {
      setSalvando(false);
    }
  }

  useEffect(() => {
    loadEmpresa();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!empresaId) return;
    loadOptions(empresaId);
    loadLista(empresaId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

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
          onClick={() => {
            if (empresaId) {
              loadOptions(empresaId);
              loadLista(empresaId);
            } else {
              loadEmpresa();
            }
          }}
          disabled={loading || loadingEmpresa}
        >
          {loading || loadingEmpresa ? 'A carregar…' : 'Recarregar'}
        </button>
      </header>

      {err && (
        <section className="card" style={{ marginBottom: 16 }}>
          <p style={{ color: 'crimson', margin: 0 }}>{err}</p>
        </section>
      )}

      {/* FORM NOVO ROTEIRO */}
      <section className="card" style={{ marginBottom: 16 }}>
        <h2 className="h2" style={{ marginTop: 0, marginBottom: 8 }}>
          Novo roteiro
        </h2>
        <p className="muted" style={{ marginTop: 0, marginBottom: 16 }}>
          Defina colaborador, tarefa, período e local de trabalho. Estes dados serão usados no cálculo de presença
          (geo/raio) e para associações de tarefas do dia.
        </p>

        <form
          onSubmit={criarRoteiro}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          {/* Colaborador */}
          <div>
            <label className="muted">Colaborador</label>
            <select
              value={form.usuario_id}
              onChange={(e) => setForm((f) => ({ ...f, usuario_id: e.target.value }))}
              style={selectStyle}
              disabled={!empresaId || loadingEmpresa}
            >
              <option value="">Selecione…</option>
              {colabOpts.map((c) => (
                <option key={c.id} value={c.id}>
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
              style={selectStyle}
              disabled={!empresaId || loadingEmpresa}
            >
              <option value="">Selecione…</option>
              {tarefaOpts.map((t) => (
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
              style={selectStyle}
              disabled={!empresaId || loadingEmpresa}
            >
              <option value="">Selecione…</option>
              {localOpts.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Data início */}
          <div>
            <label className="muted">Data início</label>
            <input
              type="date"
              value={form.data_dia}
              onChange={(e) => setForm((f) => ({ ...f, data_dia: e.target.value }))}
              style={inputStyle}
              placeholder="dd/mm/aaaa"
              disabled={!empresaId || loadingEmpresa}
            />
          </div>

          {/* Data fim */}
          <div>
            <label className="muted">Data fim (opcional)</label>
            <input
              type="date"
              value={form.data_fim}
              onChange={(e) => setForm((f) => ({ ...f, data_fim: e.target.value }))}
              style={inputStyle}
              placeholder="dd/mm/aaaa"
              disabled={!empresaId || loadingEmpresa}
            />
          </div>

          {/* Observações */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="muted">Observações (opcional)</label>
            <textarea
              value={form.observacoes}
              onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
              style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
              disabled={!empresaId || loadingEmpresa}
            />
          </div>

          <div style={{ gridColumn: '1 / -1', textAlign: 'right', marginTop: 4 }}>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={salvando || !empresaId || loadingEmpresa}
            >
              {salvando ? 'A criar…' : 'Criar roteiro'}
            </button>
          </div>
        </form>
      </section>

      {/* LISTA DE ROTEIROS */}
      <section className="card">
        <h2 className="h2" style={{ marginTop: 0, marginBottom: 8 }}>
          Roteiros existentes
        </h2>

        {!lista.length && !loading && (
          <p className="muted">Sem roteiros registados.</p>
        )}

        {!!lista.length && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: 8 }}>Colaborador (user_id)</th>
                  <th style={{ padding: 8 }}>Tarefa</th>
                  <th style={{ padding: 8 }}>Local</th>
                  <th style={{ padding: 8 }}>Data início</th>
                  <th style={{ padding: 8 }}>Data fim</th>
                  <th style={{ padding: 8 }}>Status</th>
                  <th style={{ padding: 8 }}>Observações</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: 8 }}>
                      {colabNomePorId[r.usuario_id] ?? r.usuario_id}
                    </td>
                    <td style={{ padding: 8 }}>{r.tarefa_nome || '—'}</td>
                    <td style={{ padding: 8 }}>{r.local_nome || r.local_label || '—'}</td>
                    <td style={{ padding: 8 }}>
                      {r.data_dia ? new Date(r.data_dia).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: 8 }}>
                      {r.data_fim ? new Date(r.data_fim).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: 8 }}>{r.status || '—'}</td>
                    <td style={{ padding: 8, maxWidth: 260 }}>
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
  border: '1px solid var(--border)',
  borderRadius: 10,
  background: '#fff',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'auto',
};
