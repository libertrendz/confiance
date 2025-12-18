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

  // status do roteiro
  status: string | null;

  local_label: string | null;
  observacoes: string | null;
  tarefa_id: string;
  tarefa_nome: string | null;
  local_nome: string | null;

  // auditoria / evidências (preferência: colunas no ponto_roteiros)
  foto_bucket: string | null;
  foto_checkin_path: string | null;
  foto_checkout_path: string | null;

  // almoço do dia (se você guardar no roteiro, ótimo p/ auditoria)
  almoco_saida_at: string | null;
  almoco_retorno_at: string | null;

  // conclusão/justificativa (ideal no checkout)
  tarefa_concluida: boolean | null;
  justificativa: string | null;
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

function yesNoNA(v: boolean | null | undefined) {
  if (v === true) return 'Sim';
  if (v === false) return 'Não';
  return '—';
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
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

          foto_bucket,
          foto_checkin_path,
          foto_checkout_path,

          almoco_saida_at,
          almoco_retorno_at,
          tarefa_concluida,
          justificativa,

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
          Novo roteiro
        </h2>
        <p className="muted" style={{ marginTop: 0, marginBottom: 16 }}>
          Defina colaborador, tarefa, período e local. O status evolui automaticamente: Planeado → Em andamento → Executado.
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

                  <th style={{ padding: 8 }}>Check-in</th>
                  <th style={{ padding: 8 }}>Saída almoço</th>
                  <th style={{ padding: 8 }}>Retorno almoço</th>
                  <th style={{ padding: 8 }}>Check-out</th>

                  <th style={{ padding: 8 }}>Tarefa concluída?</th>
                  <th style={{ padding: 8 }}>Justificativa</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((r) => {
                  const bucket = r.foto_bucket || 'ponto-fotos';
                  const checkinOk = !!r.foto_checkin_path;
                  const checkoutOk = !!r.foto_checkout_path;

                  return (
                    <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: 8 }}>{colabNomePorId[r.usuario_id] ?? r.usuario_id}</td>
                      <td style={{ padding: 8 }}>{r.tarefa_nome || '—'}</td>
                      <td style={{ padding: 8 }}>{r.local_nome || r.local_label || '—'}</td>
                      <td style={{ padding: 8 }}>{r.data_dia ? new Date(r.data_dia).toLocaleDateString() : '—'}</td>
                      <td style={{ padding: 8 }}>{r.data_fim ? new Date(r.data_fim).toLocaleDateString() : '—'}</td>
                      <td style={{ padding: 8, maxWidth: 260 }}>{r.observacoes || '—'}</td>

                      <td style={{ padding: 8 }}>
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
                          {statusLabel(r.status)}
                        </span>
                      </td>

                      <td style={{ padding: 8 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontWeight: 900, color: checkinOk ? '#0e3258' : '#7a8699' }}>
                            {checkinOk ? '✓' : '⏳'}
                          </span>
                          <button
                            className="btn btn-ghost"
                            type="button"
                            disabled={!r.foto_checkin_path}
                            onClick={() => r.foto_checkin_path && abrirFoto(bucket, r.foto_checkin_path)}
                          >
                            Ver foto
                          </button>
                        </div>
                      </td>

                      <td style={{ padding: 8 }}>
                        <span style={{ fontWeight: 900, color: r.almoco_saida_at ? '#0e3258' : '#7a8699' }}>
                          {r.almoco_saida_at ? '✓' : '⏳'}
                        </span>
                        <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                          {r.almoco_saida_at ? fmtDate(r.almoco_saida_at) : ''}
                        </div>
                      </td>

                      <td style={{ padding: 8 }}>
                        <span style={{ fontWeight: 900, color: r.almoco_retorno_at ? '#0e3258' : '#7a8699' }}>
                          {r.almoco_retorno_at ? '✓' : '⏳'}
                        </span>
                        <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                          {r.almoco_retorno_at ? fmtDate(r.almoco_retorno_at) : ''}
                        </div>
                      </td>

                      <td style={{ padding: 8 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontWeight: 900, color: checkoutOk ? '#0e3258' : '#7a8699' }}>
                            {checkoutOk ? '✓' : '⏳'}
                          </span>
                          <button
                            className="btn btn-ghost"
                            type="button"
                            disabled={!r.foto_checkout_path}
                            onClick={() => r.foto_checkout_path && abrirFoto(bucket, r.foto_checkout_path)}
                          >
                            Ver foto
                          </button>
                        </div>
                      </td>

                      <td style={{ padding: 8 }}>
                        {r.status === 'executado' ? yesNoNA(r.tarefa_concluida) : '—'}
                      </td>

                      <td style={{ padding: 8, maxWidth: 320 }}>
                        {r.status === 'executado'
                          ? r.tarefa_concluida === false
                            ? r.justificativa || '—'
                            : 'N/A'
                          : '—'}
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

        {!!err && (
          <p style={{ color: 'crimson', marginTop: 10 }}>
            {err}
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
