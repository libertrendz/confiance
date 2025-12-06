// app/adm/roteiros/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

type TarefaPadrao = {
  id: string;
  nome: string;
  ativo: boolean;
};

type RoteiroRow = {
  id: string;
  usuario_id: string;
  data_dia: string;
  status: string;
  local_label: string | null;
  observacoes: string | null;
  tarefa_id: string;
  // Supabase está a devolver como array de 0..1 elementos
  tarefas_padrao?: { nome: string | null }[] | null;
};

export default function RoteirosPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [tarefas, setTarefas] = useState<TarefaPadrao[]>([]);
  const [lista, setLista] = useState<RoteiroRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [form, setForm] = useState<{
    usuario_id: string;
    data_dia: string;
    tarefa_id: string;
    local_label: string;
    observacoes: string;
  }>({
    usuario_id: '',
    data_dia: new Date().toISOString().slice(0, 10),
    tarefa_id: '',
    local_label: '',
    observacoes: '',
  });

  async function loadTarefas() {
    try {
      const { data, error } = await supa
        .from('tarefas_padrao')
        .select('id, nome, ativo')
        .eq('ativo', true)
        .order('nome', { ascending: true });

      if (error) throw error;
      setTarefas((data as TarefaPadrao[]) || []);
    } catch (e: any) {
      console.error('Erro ao carregar tarefas_padrao', e);
    }
  }

  async function loadRoteiros() {
    setLoading(true);
    setErr(null);
    setMsg(null);
    try {
      const { data, error } = await supa
        .from('ponto_roteiros')
        .select(
          'id, usuario_id, data_dia, status, local_label, observacoes, tarefa_id, tarefas_padrao ( nome )'
        )
        .order('data_dia', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLista((data as RoteiroRow[]) || []);
    } catch (e: any) {
      console.error('Erro ao carregar ponto_roteiros', e);
      setErr(e?.message || 'Falha ao carregar roteiros.');
      setLista([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTarefas();
    loadRoteiros();
  }, []);

  async function criarRoteiro(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    if (!form.usuario_id.trim()) {
      setErr('Informe o ID do utilizador (user_id).');
      return;
    }
    if (!form.tarefa_id) {
      setErr('Selecione uma tarefa.');
      return;
    }
    if (!form.data_dia) {
      setErr('Informe a data.');
      return;
    }

    try {
      const payload = {
        usuario_id: form.usuario_id.trim(),
        tarefa_id: form.tarefa_id,
        data_dia: form.data_dia,
        local_label: form.local_label.trim() || null,
        observacoes: form.observacoes.trim() || null,
      };

      const { error } = await supa.from('ponto_roteiros').insert(payload);
      if (error) throw error;

      setMsg('Roteiro criado com sucesso.');
      setForm((f) => ({
        ...f,
        local_label: '',
        observacoes: '',
      }));
      await loadRoteiros();
    } catch (e: any) {
      console.error('Erro ao criar roteiro', e);
      setErr(e?.message || 'Falha ao criar roteiro.');
    }
  }

  async function apagarRoteiro(id: string) {
    if (!confirm('Eliminar este roteiro?')) return;
    try {
      const { error } = await supa.from('ponto_roteiros').delete().eq('id', id);
      if (error) throw error;
      await loadRoteiros();
    } catch (e: any) {
      alert(e?.message || 'Falha ao eliminar roteiro.');
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
        <button className="btn btn-ghost" onClick={loadRoteiros} disabled={loading}>
          {loading ? 'A carregar…' : 'Recarregar'}
        </button>
      </header>

      {/* FORM NOVO ROTEIRO */}
      <section className="card" style={{ marginBottom: 16 }}>
        <h2 className="h2" style={{ marginBottom: 8 }}>
          Definir tarefa para colaborador
        </h2>
        <p className="muted" style={{ marginBottom: 12 }}>
          Preencha o ID do utilizador (user_id), a data e a tarefa. O colaborador verá estas tarefas na
          área de ponto, na saída.
        </p>

        <form
          onSubmit={criarRoteiro}
          style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.5fr', gap: 12 }}
        >
          <div style={{ gridColumn: '1 / span 1' }}>
            <label className="muted">Utilizador (user_id)</label>
            <input
              type="text"
              required
              value={form.usuario_id}
              onChange={(e) => setForm((f) => ({ ...f, usuario_id: e.target.value }))}
              placeholder="Cole aqui o user_id do colaborador"
              style={input}
            />
            <p style={{ margin: '4px 0 0 0', fontSize: 11, color: '#8892A0' }}>
              Copie o ID da página <strong>Utilizadores</strong>.
            </p>
          </div>

          <div>
            <label className="muted">Data</label>
            <input
              type="date"
              required
              value={form.data_dia}
              onChange={(e) => setForm((f) => ({ ...f, data_dia: e.target.value }))}
              style={input}
            />
          </div>

          <div>
            <label className="muted">Tarefa</label>
            <select
              required
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

          <div style={{ gridColumn: '1 / span 2' }}>
            <label className="muted">Local (texto livre)</label>
            <input
              type="text"
              value={form.local_label}
              onChange={(e) => setForm((f) => ({ ...f, local_label: e.target.value }))}
              placeholder="Ex.: Obra Rua X, Lote 3"
              style={input}
            />
          </div>

          <div>
            <label className="muted">Observações</label>
            <input
              type="text"
              value={form.observacoes}
              onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
              placeholder="Opcional"
              style={input}
            />
          </div>

          <div style={{ alignSelf: 'end' }}>
            <button className="btn btn-primary" type="submit">
              Guardar roteiro
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
          Roteiros recentes
        </h2>

        {!lista.length && !loading && <p className="muted">Sem roteiros registados.</p>}

        {!!lista.length && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: 8 }}>Data</th>
                  <th style={{ padding: 8 }}>Utilizador (ID)</th>
                  <th style={{ padding: 8 }}>Tarefa</th>
                  <th style={{ padding: 8 }}>Local</th>
                  <th style={{ padding: 8 }}>Estado</th>
                  <th style={{ padding: 8 }}>Observações</th>
                  <th style={{ padding: 8, textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: 8 }}>
                      {r.data_dia
                        ? new Date(r.data_dia + 'T00:00:00').toLocaleDateString()
                        : '—'}
                    </td>
                    <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 11 }}>
                      {r.usuario_id}
                    </td>
                    <td style={{ padding: 8 }}>
                      {r.tarefas_padrao?.[0]?.nome || '—'}
                    </td>
                    <td style={{ padding: 8 }}>{r.local_label || '—'}</td>
                    <td style={{ padding: 8 }}>{r.status || '—'}</td>
                    <td style={{ padding: 8, fontSize: 12 }}>
                      {r.observacoes || '—'}
                    </td>
                    <td style={{ padding: 8, textAlign: 'right' }}>
                      <button
                        className="btn btn-ghost"
                        style={{ fontSize: 12 }}
                        onClick={() => apagarRoteiro(r.id)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {loading && (
          <p className="muted" style={{ marginTop: 8 }}>
            A carregar…
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
  fontSize: 13,
};
