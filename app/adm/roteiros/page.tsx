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

type AlmocoAgg = {
  out: boolean;
  in: boolean;
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

function dateStrFromIsoTZ(iso: string, tz: string) {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);

  const yyyy = parts.find((p) => p.type === 'year')?.value || '1970';
  const mm = parts.find((p) => p.type === 'month')?.value || '01';
  const dd = parts.find((p) => p.type === 'day')?.value || '01';
  return `${yyyy}-${mm}-${dd}`;
}

function safeDateOnly(d: string | null | undefined) {
  // espera 'YYYY-MM-DD'
  if (!d) return null;
  return String(d).slice(0, 10);
}

export default function RoteirosPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);

  // ✅ fixa o TZ que o backend usa para “dia local” no RPC
  // (evita admin “ver um dia diferente” dependendo do device)
  const TZ = 'Europe/Zurich';

  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [loadingEmpresa, setLoadingEmpresa] = useState(true);

  const [colabOpts, setColabOpts] = useState<SelectOption[]>([]);
  const [tarefaOpts, setTarefaOpts] = useState<SelectOption[]>([]);
  const [localOpts, setLocalOpts] = useState<SelectOption[]>([]);
  const [lista, setLista] = useState<RoteiroRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [textoModal, setTextoModal] = useState<{ titulo: string; texto: string } | null>(null);

  // ✅ mapa almoço (do dia) por colaborador+data
  // key: `${usuario_id}|${YYYY-MM-DD}`
  const [almocoMap, setAlmocoMap] = useState<Record<string, AlmocoAgg>>({});

  const colabNomePorId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of colabOpts) map[c.id] = c.nome;
    return map;
  }, [colabOpts]);

  const [salvando, setSalvando] = useState(false);

  // edição
  const [editId, setEditId] = useState<string | null>(null);

  // “tarefa nova”
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

      const { data: prof, error: profErr } = await supa.from('profiles').select('empresa_id').eq('user_id', uid).maybeSingle();
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

  // ✅ carrega status do almoço via view (do dia, não do roteiro)
  async function loadAlmocoDoDia(eid: string, roteiros: RoteiroRow[]) {
    try {
      if (!roteiros.length) {
        setAlmocoMap({});
        return;
      }

      const userIds = Array.from(new Set(roteiros.map((r) => r.usuario_id).filter(Boolean)));
      if (!userIds.length) {
        setAlmocoMap({});
        return;
      }

      // intervalo de datas baseado na lista
      const allDates: string[] = [];
      for (const r of roteiros) {
        const d1 = safeDateOnly(r.data_dia);
        const d2 = safeDateOnly(r.data_fim);
        if (d1) allDates.push(d1);
        if (d2) allDates.push(d2);
      }
      allDates.sort();
      const minDay = allDates[0] || safeDateOnly(roteiros[0].data_dia) || null;
      const maxDay = allDates[allDates.length - 1] || safeDateOnly(roteiros[0].data_dia) || null;

      // janela “folgada” pra evitar erro de timezone
      const startISO = minDay ? new Date(`${minDay}T00:00:00.000Z`).toISOString() : new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString();
      const endISO = maxDay ? new Date(`${maxDay}T23:59:59.999Z`).toISOString() : new Date().toISOString();

      // busca apenas batidas de almoço
      const { data, error } = await supa
        .from('v_adm_ponto_registros')
        .select('usuario_id,tipo,created_at,batida_at')
        .eq('empresa_id', eid)
        .in('usuario_id', userIds)
        .in('tipo', ['saida_almoco', 'retorno_almoco'])
        .gte('created_at', startISO)
        .lte('created_at', endISO)
        .order('created_at', { ascending: false })
        .limit(5000);

      if (error) throw error;

      const map: Record<string, AlmocoAgg> = {};

      for (const row of (data || []) as any[]) {
        const uid = String(row.usuario_id || '');
        if (!uid) continue;

        const base = String(row.batida_at || row.created_at || '');
        if (!base) continue;

        const day = dateStrFromIsoTZ(base, TZ);
        const key = `${uid}|${day}`;

        if (!map[key]) map[key] = { out: false, in: false };

        if (row.tipo === 'saida_almoco') map[key].out = true;
        if (row.tipo === 'retorno_almoco') map[key].in = true;
      }

      setAlmocoMap(map);
    } catch (e) {
      console.error('Erro ao carregar almoço do dia (view)', e);
      // não quebra a página – apenas mantém o fallback
      setAlmocoMap({});
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

      const mapped: RoteiroRow[] = (data || []).map((r: any) => ({
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

      setLista(mapped);

      // ✅ agora o almoço vem do “dia” via view
      await loadAlmocoDoDia(eid, mapped);
    } catch (e: any) {
      console.error('Erro ao carregar ponto_roteiros', e);
      setErr(e?.message || 'Falha ao carregar roteiros.');
      setLista([]);
      setAlmocoMap({});
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
          <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
            TZ (admin): {TZ}
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
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 12,
            alignItems: 'end',
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

          <div style={formActionSlotStyle}>
            {editId && (
              <button type="button" className="btn btn-ghost" onClick={resetForm} style={formSecondaryButtonStyle}>
                Cancelar
              </button>
            )}
            <button className="btn btn-primary" type="submit" disabled={salvando || !empresaId || loadingEmpresa} style={formPrimaryButtonStyle}>
              {salvando ? 'A salvar…' : editId ? 'Salvar alterações' : 'Criar roteiro'}
            </button>
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

        </form>
      </section>

      {/* LISTA */}
      <section className="card">
        <h2 className="h2" style={{ marginTop: 0, marginBottom: 8 }}>
          Roteiros existentes
        </h2>

        {!lista.length && !loading && <p className="muted">Sem roteiros registados.</p>}

        {!!lista.length && (
          <>
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <colgroup>
                <col style={{ width: '13%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '21%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '11%' }} />
              </colgroup>

              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={thStyle}>Colaborador</th>
                  <th style={thStyle}>Tarefa / Local</th>
                  <th style={thStyle}>Período</th>
                  <th style={thStyle}>Status</th>
                  <th style={thCenterStyle}>Registos</th>
                  <th style={thCenterStyle}>Obs.</th>
                  <th style={thStyle}>Resultado</th>
                  <th style={thStyle}>Ações</th>
                </tr>
              </thead>

              <tbody>
                {lista.map((r) => {
                  const bucket = r.foto_bucket || 'ponto-fotos';

                  const hasIn = !!r.foto_checkin_path;
                  const hasOut = !!r.foto_checkout_path;

                  const dia = safeDateOnly(r.data_dia) || '';
                  const key = `${r.usuario_id}|${dia}`;
                  const agg = almocoMap[key];

                  const hasAlmocoOut = !!(agg?.out || r.almoco_saida_at);
                  const hasAlmocoIn = !!(agg?.in || r.almoco_retorno_at);

                  const obsTexto = (r.observacoes || '').trim();
                  const justTexto = (r.justificativa || '').trim();

                  return (
                    <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={tdStyle} title={colabNomePorId[r.usuario_id] ?? r.usuario_id}>
                        <span style={mainCellTextStyle}>{colabNomePorId[r.usuario_id] ?? r.usuario_id}</span>
                      </td>

                      <td style={tdStyle}>
                        <div style={{ minWidth: 0 }}>
                          <span style={mainCellTextStyle} title={r.tarefa_nome || '—'}>
                            {r.tarefa_nome || '—'}
                          </span>
                          <span style={subCellTextStyle} title={r.local_nome || r.local_label || '—'}>
                            {r.local_nome || r.local_label || '—'}
                          </span>
                        </div>
                      </td>

                      <td style={tdStyle}>
                        <div style={periodCellStyle}>
                          <span>{r.data_dia ? new Date(r.data_dia).toLocaleDateString() : '—'}</span>
                          <span style={{ color: '#64748b' }}>{r.data_fim ? new Date(r.data_fim).toLocaleDateString() : '—'}</span>
                        </div>
                      </td>

                      <td style={tdStyle}>
                        <SmallPill text={statusLabel(r.status)} />
                      </td>

                      <td style={tdCenterStyle}>
                        <div style={registersWrapStyle}>
                          <RegisterItem
                            label="IN"
                            done={hasIn}
                            photoPath={r.foto_checkin_path}
                            onPhotoClick={() => abrirFoto(bucket, r.foto_checkin_path as string)}
                          />
                          <RegisterItem label="ALM" done={hasAlmocoOut} />
                          <RegisterItem label="RET" done={hasAlmocoIn} />
                          <RegisterItem
                            label="OUT"
                            done={hasOut}
                            photoPath={r.foto_checkout_path}
                            onPhotoClick={() => abrirFoto(bucket, r.foto_checkout_path as string)}
                          />
                        </div>
                      </td>

                      <td style={tdCenterStyle}>
                        <TextFlagButton
                          filled={!!obsTexto}
                          emptyLabel="—"
                          filledLabel="Ver"
                          onClick={() => setTextoModal({ titulo: 'Observações', texto: obsTexto })}
                        />
                      </td>

                      <td style={tdStyle}>
                        <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
                          <span style={resultTextStyle}>
                            {r.tarefa_concluida === null ? '—' : r.tarefa_concluida ? 'Concluída' : 'Não concluída'}
                          </span>

                          <TextFlagButton
                            filled={!!justTexto}
                            emptyLabel="Justif.: —"
                            filledLabel="Justif.: Ver"
                            onClick={() => setTextoModal({ titulo: 'Justificativa', texto: justTexto })}
                          />
                        </div>
                      </td>

                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button className="btn btn-ghost" type="button" onClick={() => preencherParaEditar(r)} style={miniActionButtonStyle}>
                            Editar
                          </button>
                          <button className="btn btn-ghost" type="button" onClick={() => excluirRoteiro(r.id)} style={miniActionButtonStyle}>
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

          {textoModal ? (
            <TextModal titulo={textoModal.titulo} texto={textoModal.texto} onClose={() => setTextoModal(null)} />
          ) : null}
          </>
        )}

        {loading && <p className="muted" style={{ marginTop: 8 }}>A carregar roteiros…</p>}
      </section>
    </main>
  );
}

function RegisterItem({
  label,
  done,
  photoPath,
  onPhotoClick,
}: {
  label: string;
  done: boolean;
  photoPath?: string | null;
  onPhotoClick?: () => void;
}) {
  const canOpenPhoto = !!photoPath && !!onPhotoClick;

  return (
    <div style={registerItemStyle} title={done ? `${label}: OK` : `${label}: Pendente`}>
      <span style={registerLabelStyle}>{label}</span>

      {canOpenPhoto ? (
        <button type="button" onClick={onPhotoClick} style={photoMiniButtonStyle}>
          Foto
        </button>
      ) : (
        <span style={done ? registerOkStyle : registerPendingStyle}>{done ? '✓' : '—'}</span>
      )}
    </div>
  );
}

function TextFlagButton({
  filled,
  emptyLabel,
  filledLabel,
  onClick,
}: {
  filled: boolean;
  emptyLabel: string;
  filledLabel: string;
  onClick: () => void;
}) {
  if (!filled) {
    return <span style={emptyTextFlagStyle}>{emptyLabel}</span>;
  }

  return (
    <button type="button" onClick={onClick} style={textFlagButtonStyle}>
      {filledLabel}
    </button>
  );
}

function TextModal({ titulo, texto, onClose }: { titulo: string; texto: string; onClose: () => void }) {
  return (
    <div style={modalBackdropStyle} role="dialog" aria-modal="true">
      <div style={modalCardStyle}>
        <div style={modalHeaderStyle}>
          <h3 style={{ margin: 0, fontSize: 16, color: '#0e3258' }}>{titulo}</h3>
          <button type="button" onClick={onClose} style={modalCloseButtonStyle}>
            Fechar
          </button>
        </div>

        <div style={modalTextStyle}>{texto}</div>
      </div>
    </div>
  );
}

const tableWrapStyle: React.CSSProperties = {
  width: '100%',
  overflowX: 'hidden',
  border: '1px solid var(--border)',
  borderRadius: 14,
  background: '#fff',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'separate',
  borderSpacing: 0,
  tableLayout: 'fixed',
  fontSize: 12,
};

const thStyle: React.CSSProperties = {
  padding: '9px 8px',
  fontSize: 11,
  fontWeight: 900,
  color: '#0e3258',
  whiteSpace: 'nowrap',
  verticalAlign: 'middle',
  background: '#F8FAFC',
  borderBottom: '1px solid var(--border)',
};

const thCenterStyle: React.CSSProperties = {
  ...thStyle,
  textAlign: 'center',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 8px',
  verticalAlign: 'middle',
  minWidth: 0,
};

const tdCenterStyle: React.CSSProperties = {
  ...tdStyle,
  textAlign: 'center',
};

const mainCellTextStyle: React.CSSProperties = {
  display: 'block',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  minWidth: 0,
  fontWeight: 700,
  color: '#0f172a',
};

const subCellTextStyle: React.CSSProperties = {
  display: 'block',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  minWidth: 0,
  marginTop: 3,
  fontSize: 11,
  color: '#64748b',
};

const periodCellStyle: React.CSSProperties = {
  display: 'grid',
  gap: 3,
  fontSize: 12,
  color: '#0f172a',
  lineHeight: 1.2,
};

const registersWrapStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: 5,
  alignItems: 'stretch',
};

const registerItemStyle: React.CSSProperties = {
  display: 'grid',
  gap: 4,
  alignItems: 'center',
  justifyItems: 'center',
  minWidth: 0,
  padding: '5px 4px',
  border: '1px solid #E2E8F0',
  borderRadius: 10,
  background: '#FFFFFF',
};

const registerLabelStyle: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 900,
  color: '#0e3258',
  letterSpacing: 0.3,
};

const registerOkStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 900,
  lineHeight: 1,
  color: '#067647',
};

const registerPendingStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 900,
  lineHeight: 1,
  color: '#94A3B8',
};

const photoMiniButtonStyle: React.CSSProperties = {
  padding: '3px 6px',
  borderRadius: 8,
  border: '1px solid #A6F4C5',
  background: '#ECFDF3',
  color: '#067647',
  fontSize: 10,
  fontWeight: 800,
  lineHeight: 1.1,
  cursor: 'pointer',
};

const resultTextStyle: React.CSSProperties = {
  display: 'block',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: 12,
  fontWeight: 700,
  color: '#0f172a',
};

const textFlagButtonStyle: React.CSSProperties = {
  padding: '4px 8px',
  borderRadius: 999,
  border: '1px solid #D7E3FF',
  background: '#EEF3FF',
  color: '#0e3258',
  fontSize: 11,
  fontWeight: 800,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const emptyTextFlagStyle: React.CSSProperties = {
  color: '#64748b',
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: 'nowrap',
};

const miniActionButtonStyle: React.CSSProperties = {
  padding: '6px 9px',
  fontSize: 11,
  fontWeight: 800,
  lineHeight: 1.1,
  borderRadius: 9,
};

const modalBackdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 80,
  display: 'grid',
  placeItems: 'center',
  padding: 18,
  background: 'rgba(15,23,42,0.38)',
};

const modalCardStyle: React.CSSProperties = {
  width: 'min(620px, 100%)',
  maxHeight: '80vh',
  overflow: 'hidden',
  borderRadius: 18,
  background: '#fff',
  border: '1px solid #E2E8F0',
  boxShadow: '0 20px 50px rgba(15,23,42,0.22)',
};

const modalHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 10,
  padding: '14px 16px',
  borderBottom: '1px solid #E2E8F0',
};

const modalCloseButtonStyle: React.CSSProperties = {
  padding: '7px 10px',
  borderRadius: 10,
  border: '1px solid #D7E3FF',
  background: '#fff',
  color: '#0e3258',
  fontWeight: 800,
  cursor: 'pointer',
};

const modalTextStyle: React.CSSProperties = {
  padding: 16,
  whiteSpace: 'pre-wrap',
  overflowY: 'auto',
  maxHeight: 'calc(80vh - 64px)',
  color: '#0f172a',
  fontSize: 13,
  lineHeight: 1.5,
};

const formActionSlotStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'end',
  justifyContent: 'flex-end',
  gap: 8,
  minWidth: 0,
};

const formPrimaryButtonStyle: React.CSSProperties = {
  minHeight: 41,
  padding: '10px 14px',
  fontWeight: 900,
  whiteSpace: 'nowrap',
};

const formSecondaryButtonStyle: React.CSSProperties = {
  minHeight: 41,
  padding: '10px 12px',
  fontWeight: 800,
  whiteSpace: 'nowrap',
};

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
