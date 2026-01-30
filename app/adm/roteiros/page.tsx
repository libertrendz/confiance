// app/adm/roteiros/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

type SelectOption = { id: string; nome: string };

type RoteiroRow = {
  id: string;
  usuario_id: string;
  data_dia: string;
  data_fim: string | null;
  status: string | null;
  local_label: string | null;
  observacoes: string | null;
  tarefa_id: string;
  tarefa_nome: string | null;
  local_nome: string | null;

  foto_bucket: string | null;
  foto_checkin_path: string | null;
  foto_checkout_path: string | null;

  almoco_saida_at: string | null;
  almoco_retorno_at: string | null;

  tarefa_concluida: boolean | null;
  justificativa: string | null;

  local_id: string | null;
};

function statusLabel(s: string | null) {
  switch (s) {
    case 'planeado':
      return 'Planeado';
    case 'em_andamento':
      return 'Em andamento';
    case 'executado':
      return 'Executado';
    default:
      return s || '—';
  }
}

function SmallPill({ text }: { text: string }) {
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 700,
        background: '#EEF3FF',
        color: '#0e3258',
        padding: '6px 10px',
        borderRadius: 999,
        border: '1px solid #D7E3FF',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </span>
  );
}

function CellClock({ done }: { done: boolean }) {
  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: 16,
      }}
      title={done ? 'OK' : 'Pendente'}
    >
      {done ? '✓' : '🕒'}
    </div>
  );
}

function todayStrZurich() {
  // admin painel não precisa ser "do device": é pra ver o dia do sistema/regra
  // (se preferir, troca Europe/Zurich por TZ padrão do teu negócio)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Zurich',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const yyyy = parts.find((p) => p.type === 'year')?.value || '1970';
  const mm = parts.find((p) => p.type === 'month')?.value || '01';
  const dd = parts.find((p) => p.type === 'day')?.value || '01';
  return `${yyyy}-${mm}-${dd}`;
}

export default function RoteirosPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);

  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [loadingEmpresa, setLoadingEmpresa] = useState(true);

  const [colabOpts, setColabOpts] = useState<SelectOption[]>([]);
  const [tarefaOpts, setTarefaOpts] = useState<SelectOption[]>([]);
  const [localOpts, setLocalOpts] = useState<SelectOption[]>([]);
  const [lista, setLista] = useState<RoteiroRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const colabNomePorId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of colabOpts) map[c.id] = c.nome;
    return map;
  }, [colabOpts]);

  const [salvando, setSalvando] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);

  const [criandoTarefa, setCriandoTarefa] = useState(false);
  const [novaTarefaNome, setNovaTarefaNome] = useState('');

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
      if (!eid) throw new Error('Perfil sem empresa_id. Contacte o administrador do sistema.');

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
      setTarefaOpts((tarefas || []) as SelectOption[]);

      const { data: locais, error: localErr } = await supa
        .from('locais_permitidos')
        .select('id, nome')
        .eq('empresa_id', eid)
        .eq('ativo', true)
        .order('nome', { ascending: true });

      if (localErr) throw localErr;
      setLocalOpts((locais || []) as SelectOption[]);
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
          created_at,
          updated_at,
          tarefas_padrao ( nome ),
          locais_permitidos ( nome ),

          foto_bucket,
          foto_checkin_path,
          foto_checkout_path,
          almoco_saida_at,
          almoco_retorno_at,
          tarefa_concluida,
          justificativa
        `
        )
        .eq('empresa_id', eid)
        .order('updated_at', { ascending: false })
        .order('created_at', { ascending: false })
        .order('data_dia', { ascending: false })
        .limit(250);

      if (error) throw error;

      const mappedBase: RoteiroRow[] = (data || []).map((r: any) => ({
        id: r.id,
        usuario_id: r.usuario_id,
        data_dia: r.data_dia,
        data_fim: r.data_fim,
        status: r.status ?? null,
        local_label: r.local_label,
        observacoes: r.observacoes,
        tarefa_id: r.tarefa_id,
        tarefa_nome: r.tarefas_padrao?.nome ?? null,
        local_nome: r.locais_permitidos?.nome ?? null,

        foto_bucket: r.foto_bucket ?? 'ponto-fotos',
        foto_checkin_path: r.foto_checkin_path ?? null,
        foto_checkout_path: r.foto_checkout_path ?? null,

        almoco_saida_at: r.almoco_saida_at ?? null,
        almoco_retorno_at: r.almoco_retorno_at ?? null,

        tarefa_concluida: typeof r.tarefa_concluida === 'boolean' ? r.tarefa_concluida : null,
        justificativa: r.justificativa ?? null,

        local_id: r.local_id ?? null,
      }));

      // ✅ COMPLEMENTO UI: busca os pontos de HOJE e “reforça” almoço no painel
      // (porque o almoço é gravado em ponto_registro e nem sempre em ponto_roteiros)
      const todayZurich = todayStrZurich();

      const { data: pontos, error: pontosErr } = await supa
        .from('ponto_registro')
        .select('tipo, created_at, meta')
        .eq('empresa_id', eid)
        .gte('created_at', `${todayZurich}T00:00:00.000Z`)
        .lte('created_at', `${todayZurich}T23:59:59.999Z`)
        .limit(2000);

      if (pontosErr) {
        // não quebra o painel se der erro aqui
        console.warn('Falha ao carregar pontos do dia para UI do almoço', pontosErr);
        setLista(mappedBase);
        return;
      }

      const almocoMap: Record<string, { saida: boolean; retorno: boolean }> = {};

      for (const p of pontos || []) {
        const tipo = (p as any).tipo as string | undefined;
        const rid = (p as any)?.meta?.roteiro_id ? String((p as any).meta.roteiro_id) : '';
        if (!rid) continue;

        if (!almocoMap[rid]) almocoMap[rid] = { saida: false, retorno: false };

        if (tipo === 'saida_almoco') almocoMap[rid].saida = true;
        if (tipo === 'retorno_almoco') almocoMap[rid].retorno = true;
      }

      const merged = mappedBase.map((r) => {
        const m = almocoMap[r.id];
        // se já tem coluna preenchida, mantém; se não, usa o mapa do ponto_registro
        return {
          ...r,
          almoco_saida_at: r.almoco_saida_at ?? (m?.saida ? 'ok' : null),
          almoco_retorno_at: r.almoco_retorno_at ?? (m?.retorno ? 'ok' : null),
        };
      });

      setLista(merged);
    } catch (e: any) {
      console.error('Erro ao carregar ponto_roteiros', e);
      setErr(e?.message || 'Falha ao carregar roteiros.');
      setLista([]);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEditId(null);
    setCriandoTarefa(false);
    setNovaTarefaNome('');
    setForm({
      usuario_id: '',
      tarefa_id: '',
      local_id: '',
      data_dia: '',
      data_fim: '',
      observacoes: '',
    });
  }

  function preencherParaEditar(r: RoteiroRow) {
    setEditId(r.id);
    setCriandoTarefa(false);
    setNovaTarefaNome('');
    setForm({
      usuario_id: r.usuario_id,
      tarefa_id: r.tarefa_id || '',
      local_id: r.local_id || '',
      data_dia: r.data_dia || '',
      data_fim: r.data_fim || '',
      observacoes: r.observacoes || '',
    });
  }

  async function criarTarefaPadraoSeNecessario(): Promise<string | null> {
    if (!criandoTarefa) return null;

    const nome = novaTarefaNome.trim();
    if (!nome) {
      setErr('Informe o nome da nova tarefa.');
      return null;
    }

    try {
      const { data, error } = await supa.from('tarefas_padrao').insert({ nome, ativo: true }).select('id').maybeSingle();
      if (error) throw error;

      const newId = (data as any)?.id as string | undefined;
      if (!newId) throw new Error('Não foi possível obter o id da nova tarefa.');

      await loadOptions(empresaId as string);
      return newId;
    } catch (e: any) {
      setErr(e?.message || 'Falha ao criar tarefa.');
      return null;
    }
  }

  async function salvarRoteiro(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!empresaId) {
      setErr('Empresa não carregada. Recarregue a página e tente novamente.');
      return;
    }

    if (!form.usuario_id || !form.local_id || !form.data_dia) {
      setErr('Preencha colaborador, local e data início.');
      return;
    }

    setSalvando(true);
    try {
      let tarefaIdFinal = form.tarefa_id;

      if (criandoTarefa) {
        const newId = await criarTarefaPadraoSeNecessario();
        if (!newId) return;
        tarefaIdFinal = newId;
      }

      if (!tarefaIdFinal) {
        setErr('Selecione uma tarefa (ou crie uma nova).');
        return;
      }

      const payload: any = {
        empresa_id: empresaId,
        usuario_id: form.usuario_id,
        tarefa_id: tarefaIdFinal,
        local_id: form.local_id,
        data_dia: form.data_dia,
        observacoes: form.observacoes || null,
      };

      if (form.data_fim) payload.data_fim = form.data_fim;

      if (editId) {
        const { error } = await supa.from('ponto_roteiros').update(payload).eq('id', editId).eq('empresa_id', empresaId);
        if (error) throw error;
        alert('Roteiro atualizado.');
      } else {
        payload.status = 'planeado';
        const { error } = await supa.from('ponto_roteiros').insert(payload);
        if (error) throw error;
        alert('Roteiro criado com sucesso.');
      }

      resetForm();
      await loadLista(empresaId);
    } catch (e: any) {
      console.error('Erro ao salvar roteiro', e);
      setErr(e?.message || 'Falha ao salvar roteiro.');
    } finally {
      setSalvando(false);
    }
  }

  async function excluirRoteiro(id: string) {
    if (!empresaId) return;
    const ok = window.confirm('Tem certeza que deseja excluir este roteiro?');
    if (!ok) return;

    setErr(null);
    try {
      const { error } = await supa.from('ponto_roteiros').delete().eq('id', id).eq('empresa_id', empresaId);
      if (error) throw error;

      if (editId === id) resetForm();
      await loadLista(empresaId);
    } catch (e: any) {
      setErr(e?.message || 'Falha ao excluir roteiro.');
    }
  }

  async function recarregarTudo() {
    if (!empresaId) {
      await carregarEmpresaDoAdmin();
      return;
    }
    await Promise.all([loadOptions(empresaId), loadLista(empresaId)]);
  }

  async function abrirFoto(bucket: string, path: string) {
    try {
      const { data, error } = await supa.storage.from(bucket).createSignedUrl(path, 60 * 10);
      if (error) throw error;
      const url = data?.signedUrl;
      if (!url) throw new Error('Não foi possível gerar URL.');
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      alert(e?.message || 'Falha ao abrir a foto.');
    }
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
            {loadingEmpresa ? 'A carregar empresa…' : empresaId ? `Empresa: ${empresaId.slice(0, 8)}…` : 'Empresa não carregada'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <a
            href="/adm/locais"
            className="btn btn-ghost"
            style={{
              textDecoration: 'none',
              background: '#FFD24D',
              color: '#0e3258',
              border: 'none',
              fontWeight: 500,
            }}
          >
            Locais permitidos →
          </a>

          <button className="btn btn-ghost" onClick={recarregarTudo} disabled={loading || loadingEmpresa}>
            {loading || loadingEmpresa ? 'A carregar…' : 'Recarregar'}
          </button>
        </div>
      </header>

      {/* FORM */}
      <section className="card" style={{ marginBottom: 16 }}>
        <h2 className="h2" style={{ marginTop: 0, marginBottom: 8 }}>
          {editId ? 'Editar roteiro' : 'Novo roteiro'}
        </h2>

        <p className="muted" style={{ marginTop: 0, marginBottom: 16 }}>
          O status evolui automaticamente: Planeado → Em andamento → Executado.
        </p>

        <form
          onSubmit={salvarRoteiro}
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
              value={criandoTarefa ? '__outra__' : form.tarefa_id}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '__outra__') {
                  setCriandoTarefa(true);
                  setForm((f) => ({ ...f, tarefa_id: '' }));
                } else {
                  setCriandoTarefa(false);
                  setNovaTarefaNome('');
                  setForm((f) => ({ ...f, tarefa_id: v }));
                }
              }}
              style={selectStyle}
              disabled={!empresaId || loadingEmpresa}
            >
              <option value="">Selecione…</option>
              {tarefaOpts.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
              <option value="__outra__">Outra…</option>
            </select>

            {criandoTarefa && (
              <div style={{ marginTop: 8 }}>
                <input
                  value={novaTarefaNome}
                  onChange={(e) => setNovaTarefaNome(e.target.value)}
                  style={inputStyle}
                  placeholder="Nome da nova tarefa"
                  disabled={!empresaId || loadingEmpresa}
                />
                <p className="muted" style={{ fontSize: 11, marginTop: 6 }}>
                  A tarefa será criada e usada neste roteiro.
                </p>
              </div>
            )}
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

          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {editId && (
              <button type="button" className="btn btn-ghost" onClick={resetForm}>
                Cancelar
              </button>
            )}
            <button className="btn btn-primary" type="submit" disabled={salvando || !empresaId || loadingEmpresa}>
              {salvando ? 'A salvar…' : editId ? 'Salvar alterações' : 'Criar roteiro'}
            </button>
          </div>
        </form>
      </section>

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
                  <th style={{ padding: 8 }}>Observações</th>
                  <th style={{ padding: 8 }}>Status</th>
                  <th style={{ padding: 8, textAlign: 'center' }}>Check-in</th>
                  <th style={{ padding: 8, textAlign: 'center' }}>Saída almoço</th>
                  <th style={{ padding: 8, textAlign: 'center' }}>Retorno almoço</th>
                  <th style={{ padding: 8, textAlign: 'center' }}>Check-out</th>
                  <th style={{ padding: 8 }}>Tarefa concluída?</th>
                  <th style={{ padding: 8 }}>Justificativa</th>
                  <th style={{ padding: 8 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((r) => {
                  const bucket = r.foto_bucket || 'ponto-fotos';

                  const hasIn = !!r.foto_checkin_path;
                  const hasOut = !!r.foto_checkout_path;

                  // ✅ agora almoço pode vir da coluna ou do “ok” (merge feito no loadLista)
                  const hasAlmocoOut = !!r.almoco_saida_at;
                  const hasAlmocoIn = !!r.almoco_retorno_at;

                  return (
                    <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: 8 }}>{colabNomePorId[r.usuario_id] ?? r.usuario_id}</td>
                      <td style={{ padding: 8 }}>{r.tarefa_nome || '—'}</td>
                      <td style={{ padding: 8 }}>{r.local_nome || r.local_label || '—'}</td>
                      <td style={{ padding: 8 }}>{r.data_dia ? new Date(r.data_dia).toLocaleDateString() : '—'}</td>
                      <td style={{ padding: 8 }}>{r.data_fim ? new Date(r.data_fim).toLocaleDateString() : '—'}</td>
                      <td style={{ padding: 8, maxWidth: 240 }}>{r.observacoes || '—'}</td>

                      <td style={{ padding: 8 }}>
                        <SmallPill text={statusLabel(r.status)} />
                      </td>

                      <td style={{ padding: 8, textAlign: 'center' }}>
                        {hasIn ? (
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => abrirFoto(bucket, r.foto_checkin_path as string)}
                            style={{
                              padding: '6px 10px',
                              fontWeight: 600,
                              fontSize: 12,
                              background: '#ECFDF3',
                              border: '1px solid #A6F4C5',
                              color: '#067647',
                            }}
                          >
                            Ver foto
                          </button>
                        ) : (
                          <CellClock done={false} />
                        )}
                      </td>

                      <td style={{ padding: 8, textAlign: 'center' }}>
                        <CellClock done={hasAlmocoOut} />
                      </td>

                      <td style={{ padding: 8, textAlign: 'center' }}>
                        <CellClock done={hasAlmocoIn} />
                      </td>

                      <td style={{ padding: 8, textAlign: 'center' }}>
                        {hasOut ? (
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => abrirFoto(bucket, r.foto_checkout_path as string)}
                            style={{
                              padding: '6px 10px',
                              fontWeight: 600,
                              fontSize: 12,
                              background: '#ECFDF3',
                              border: '1px solid #A6F4C5',
                              color: '#067647',
                            }}
                          >
                            Ver foto
                          </button>
                        ) : (
                          <CellClock done={false} />
                        )}
                      </td>

                      <td style={{ padding: 8 }}>
                        {r.tarefa_concluida === null ? '—' : r.tarefa_concluida ? 'Sim' : 'Não'}
                      </td>
                      <td style={{ padding: 8, maxWidth: 260 }}>{r.justificativa || '—'}</td>

                      <td style={{ padding: 8 }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button className="btn btn-ghost" type="button" onClick={() => preencherParaEditar(r)}>
                            Editar
                          </button>
                          <button className="btn btn-ghost" type="button" onClick={() => excluirRoteiro(r.id)}>
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
