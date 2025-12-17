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
  local_id?: string | null;
};

type StatusRoteiro = 'planeado' | 'ativo' | 'concluido' | 'cancelado';

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

  // edição
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    usuario_id: string;
    tarefa_id: string;
    local_id: string;
    data_dia: string;
    data_fim: string;
    status: StatusRoteiro;
    observacoes: string;
  }>({
    usuario_id: '',
    tarefa_id: '',
    local_id: '',
    data_dia: '',
    data_fim: '',
    status: 'planeado',
    observacoes: '',
  });

  async function carregarEmpresaDoAdmin() {
    setLoadingEmpresa(true);
    setErr(null);

    try {
      const { data: ud, error: userErr } = await supa.auth.getUser();
      if (userErr) throw userErr;

      const uid = ud.user?.id ?? null;
      if (!uid) throw new Error('Sessão expirada. Faça login novamente.');

      const { data: prof, error: profErr } = await supa
        .from('profiles')
        .select('empresa_id')
        .eq('user_id', uid)
        .maybeSingle();

      if (profErr) throw profErr;
      const eid = prof?.empresa_id ?? null;

      if (!eid) {
        throw new Error('Perfil sem empresa_id. Contacte o administrador do sistema.');
      }

      setEmpresaId(eid);
    } catch (e: any) {
      console.error('Erro ao carregar empresa do admin', e);
      setEmpresaId(null);
      setErr(e?.message || 'Falha ao carregar empresa do utilizador.');
    } finally {
      setLoadingEmpresa(false);
    }
  }

  async function loadOptions(eid: string) {
    setErr(null);
    try {
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

      const { data: tarefas, error: tarefaErr } = await supa
        .from('tarefas_padrao')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome', { ascending: true });

      if (tarefaErr) throw tarefaErr;
      setTarefaOpts((tarefas || []) as Option[]);

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
          local_id,
          tarefas_padrao ( nome ),
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
        local_id: r.local_id ?? null,
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

    if (!empresaId) {
      setErr('Empresa não carregada. Recarregue a página e tente novamente.');
      return;
    }

    if (!form.usuario_id || !form.tarefa_id || !form.local_id || !form.data_dia) {
      setErr('Preencha colaborador, tarefa, local e data início.');
      return;
    }

    setSalvando(true);
    try {
      const payload: any = {
        empresa_id: empresaId,
        usuario_id: form.usuario_id,
        tarefa_id: form.tarefa_id,
        local_id: form.local_id,
        data_dia: form.data_dia,
        status: 'planeado',
        observacoes: form.observacoes || null,
      };

      if (form.data_fim) payload.data_fim = form.data_fim;

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

  function startEdit(r: RoteiroRow) {
    setErr(null);
    setEditId(r.id);
    setEditForm({
      usuario_id: r.usuario_id || '',
      tarefa_id: r.tarefa_id || '',
      local_id: (r.local_id as string) || '',
      data_dia: r.data_dia || '',
      data_fim: r.data_fim || '',
      status: (r.status as StatusRoteiro) || 'planeado',
      observacoes: r.observacoes || '',
    });
  }

  function cancelEdit() {
    setEditId(null);
    setEditForm({
      usuario_id: '',
      tarefa_id: '',
      local_id: '',
      data_dia: '',
      data_fim: '',
      status: 'planeado',
      observacoes: '',
    });
  }

  async function salvarEdicao() {
    setErr(null);

    if (!empresaId) {
      setErr('Empresa não carregada.');
      return;
    }
    if (!editId) return;

    if (!editForm.usuario_id || !editForm.tarefa_id || !editForm.local_id || !editForm.data_dia) {
      setErr('Na edição, preencha colaborador, tarefa, local e data início.');
      return;
    }

    setSalvando(true);
    try {
      const payload: any = {
        usuario_id: editForm.usuario_id,
        tarefa_id: editForm.tarefa_id,
        local_id: editForm.local_id,
        data_dia: editForm.data_dia,
        status: editForm.status,
        observacoes: editForm.observacoes || null,
        data_fim: editForm.data_fim || null,
      };

      const { error } = await supa
        .from('ponto_roteiros')
        .update(payload)
        .eq('id', editId)
        .eq('empresa_id', empresaId);

      if (error) throw error;

      await loadLista(empresaId);
      cancelEdit();
      alert('Roteiro atualizado.');
    } catch (e: any) {
      console.error('Erro ao atualizar roteiro', e);
      setErr(e?.message || 'Falha ao atualizar roteiro.');
    } finally {
      setSalvando(false);
    }
  }

  async function excluirRoteiro(id: string) {
    if (!empresaId) return;
    const ok = window.confirm('Tem certeza que deseja excluir este roteiro?');
    if (!ok) return;

    setErr(null);
    setSalvando(true);
    try {
      const { error } = await supa
        .from('ponto_roteiros')
        .delete()
        .eq('id', id)
        .eq('empresa_id', empresaId);

      if (error) throw error;

      await loadLista(empresaId);
      if (editId === id) cancelEdit();
      alert('Roteiro excluído.');
    } catch (e: any) {
      console.error('Erro ao excluir roteiro', e);
      setErr(e?.message || 'Falha ao excluir roteiro.');
    } finally {
      setSalvando(false);
    }
  }

  async function recarregarTudo() {
    if (!empresaId) {
      await carregarEmpresaDoAdmin();
      return;
    }
    await Promise.all([loadOptions(empresaId), loadLista(empresaId)]);
  }

  useEffect(() => {
    (async () => {
      await carregarEmpresaDoAdmin();
    })();
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
          gap: 12,
        }}
      >
        <div>
          <h1 className="h1" style={{ marginBottom: 4 }}>
            Roteiros de trabalho
          </h1>
          <div className="muted" style={{ fontSize: 12 }}>
            {loadingEmpresa
              ? 'A carregar empresa…'
              : empresaId
              ? `Empresa: ${empresaId.slice(0, 8)}…`
              : 'Empresa não carregada'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <a
            href="/adm/locais"
            className="btn btn-ghost"
            style={{ textDecoration: 'none' }}
          >
            Locais permitidos →
          </a>
          <button className="btn btn-ghost" onClick={recarregarTudo} disabled={loading || loadingEmpresa}>
            {loading || loadingEmpresa ? 'A carregar…' : 'Recarregar'}
          </button>
        </div>
      </header>

      {/* FORM NOVO ROTEIRO */}
      <section className="card" style={{ marginBottom: 16 }}>
        <h2 className="h2" style={{ marginTop: 0, marginBottom: 8 }}>
          Novo roteiro
        </h2>
        <p className="muted" style={{ marginTop: 0, marginBottom: 16 }}>
          Defina colaborador, tarefa, período e local de trabalho.
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

          <div>
            <label className="muted">Data início</label>
            <input
              type="date"
              value={form.data_dia}
              onChange={(e) => setForm((f) => ({ ...f, data_dia: e.target.value }))}
              style={inputStyle}
              disabled={!empresaId || loadingEmpresa}
            />
          </div>

          <div>
            <label className="muted">Data fim (opcional)</label>
            <input
              type="date"
              value={form.data_fim}
              onChange={(e) => setForm((f) => ({ ...f, data_fim: e.target.value }))}
              style={inputStyle}
              disabled={!empresaId || loadingEmpresa}
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label className="muted">Observações (opcional)</label>
            <textarea
              value={form.observacoes}
              onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
              style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
              disabled={!empresaId || loadingEmpresa}
            />
          </div>

          {err && (
            <p style={{ color: 'crimson', gridColumn: '1 / -1', margin: 0 }}>
              {err}
            </p>
          )}

          <div style={{ gridColumn: '1 / -1', textAlign: 'right', marginTop: 4 }}>
            <button className="btn btn-primary" type="submit" disabled={salvando || !empresaId || loadingEmpresa}>
              {salvando ? 'A criar…' : 'Criar roteiro'}
            </button>
          </div>
        </form>
      </section>

      {/* EDITOR INLINE */}
      {editId && (
        <section className="card" style={{ marginBottom: 16 }}>
          <h2 className="h2" style={{ marginTop: 0, marginBottom: 8 }}>
            Editar roteiro
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            <div>
              <label className="muted">Colaborador</label>
              <select
                value={editForm.usuario_id}
                onChange={(e) => setEditForm((f) => ({ ...f, usuario_id: e.target.value }))}
                style={selectStyle}
              >
                <option value="">Selecione…</option>
                {colabOpts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="muted">Tarefa</label>
              <select
                value={editForm.tarefa_id}
                onChange={(e) => setEditForm((f) => ({ ...f, tarefa_id: e.target.value }))}
                style={selectStyle}
              >
                <option value="">Selecione…</option>
                {tarefaOpts.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="muted">Local</label>
              <select
                value={editForm.local_id}
                onChange={(e) => setEditForm((f) => ({ ...f, local_id: e.target.value }))}
                style={selectStyle}
              >
                <option value="">Selecione…</option>
                {localOpts.map((l) => (
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
                value={editForm.data_dia}
                onChange={(e) => setEditForm((f) => ({ ...f, data_dia: e.target.value }))}
                style={inputStyle}
              />
            </div>

            <div>
              <label className="muted">Data fim</label>
              <input
                type="date"
                value={editForm.data_fim}
                onChange={(e) => setEditForm((f) => ({ ...f, data_fim: e.target.value }))}
                style={inputStyle}
              />
            </div>

            <div>
              <label className="muted">Status</label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as StatusRoteiro }))}
                style={selectStyle}
              >
                <option value="planeado">planeado</option>
                <option value="ativo">ativo</option>
                <option value="concluido">concluido</option>
                <option value="cancelado">cancelado</option>
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label className="muted">Observações</label>
              <textarea
                value={editForm.observacoes}
                onChange={(e) => setEditForm((f) => ({ ...f, observacoes: e.target.value }))}
                style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-ghost" type="button" onClick={cancelEdit} disabled={salvando}>
                Cancelar
              </button>
              <button className="btn btn-primary" type="button" onClick={salvarEdicao} disabled={salvando}>
                {salvando ? 'A salvar…' : 'Salvar edição'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* LISTA */}
      <section className="card">
        <h2 className="h2" style={{ marginTop: 0, marginBottom: 8 }}>
          Roteiros existentes
        </h2>

        {!lista.length && !loading && <p className="muted">Sem roteiros registados.</p>}

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
                  <th style={{ padding: 8 }}>Status</th>
                  <th style={{ padding: 8 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: 8 }}>{colabNomePorId[r.usuario_id] ?? r.usuario_id}</td>
                    <td style={{ padding: 8 }}>{r.tarefa_nome || '—'}</td>
                    <td style={{ padding: 8 }}>{r.local_nome || r.local_label || '—'}</td>
                    <td style={{ padding: 8 }}>{r.data_dia ? new Date(r.data_dia).toLocaleDateString() : '—'}</td>
                    <td style={{ padding: 8 }}>{r.data_fim ? new Date(r.data_fim).toLocaleDateString() : '—'}</td>
                    <td style={{ padding: 8 }}>{r.status || '—'}</td>
                    <td style={{ padding: 8 }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button className="btn btn-ghost" type="button" onClick={() => startEdit(r)} disabled={salvando}>
                          Editar
                        </button>
                        <button className="btn btn-ghost" type="button" onClick={() => excluirRoteiro(r.id)} disabled={salvando}>
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {loading && <p className="muted" style={{ marginTop: 8 }}>A carregar roteiros…</p>}
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
