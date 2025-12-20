// app/adm/fornecedores/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

type Row = {
  id: string;
  codigo: string | null;
  denominacao: string | null;
  nif: string | null;
  telefone: string | null;
  email: string | null;
  ativo: boolean | null;
};

type NewForm = {
  denominacao: string;
  nif: string;
  email: string;
  telefone: string;
};

export default function FornecedoresPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [loadingEmpresa, setLoadingEmpresa] = useState(true);

  const [creating, setCreating] = useState(false);
  const [newForm, setNewForm] = useState<NewForm>({
    denominacao: '',
    nif: '',
    email: '',
    telefone: '',
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
        .select('empresa_id, papel')
        .eq('user_id', uid)
        .maybeSingle();

      if (profErr) throw profErr;

      const eid = (prof as any)?.empresa_id ?? null;
      if (!eid) throw new Error('Perfil sem empresa_id. Contacte o administrador do sistema.');

      // opcional: se quiser travar aqui também
      const papel = (prof as any)?.papel ?? null;
      if (papel !== 'admin' && papel !== 'gestor') {
        throw new Error('Sem permissão para aceder a fornecedores.');
      }

      setEmpresaId(eid);
    } catch (e: any) {
      setEmpresaId(null);
      setErr(e?.message || 'Falha ao carregar empresa/permissões.');
    } finally {
      setLoadingEmpresa(false);
    }
  }

  async function load() {
    if (!empresaId) return;

    setLoading(true);
    setErr(null);

    try {
      let query = supa
        .from('fornecedores')
        .select('id,codigo,denominacao,nif,telefone,email,ativo')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });

      const term = q.trim();
      if (term) {
        const safe = term.replace(/[%_]/g, '\\$&');
        query = query.or(
          [
            `denominacao.ilike.%${safe}%`,
            `nif.ilike.%${safe}%`,
            `telefone.ilike.%${safe}%`,
            `email.ilike.%${safe}%`,
            `codigo.ilike.%${safe}%`,
          ].join(',')
        );
      }

      const { data, error } = await query;
      if (error) throw error;

      setRows((data as Row[]) || []);
    } catch (e: any) {
      setErr(e?.message || 'Falha ao listar');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function createQuick(e: React.FormEvent) {
    e.preventDefault();
    if (!empresaId) return;

    setCreating(true);
    setErr(null);

    try {
      const payload: any = {
        empresa_id: empresaId,
        denominacao: newForm.denominacao.trim(),
        nif: newForm.nif.trim() || null,
        email: newForm.email.trim() || null,
        telefone: newForm.telefone.trim() || null,
        ativo: true,
      };

      const { error } = await supa.from('fornecedores').insert(payload);
      if (error) throw error;

      setNewForm({ denominacao: '', nif: '', email: '', telefone: '' });
      await load();
      alert('Fornecedor criado.');
    } catch (e: any) {
      setErr(e?.message || 'Falha ao criar');
    } finally {
      setCreating(false);
    }
  }

  async function remove(id: string) {
    if (!empresaId) return;
    if (!confirm('Eliminar este fornecedor?')) return;

    try {
      const { error } = await supa
        .from('fornecedores')
        .delete()
        .eq('empresa_id', empresaId)
        .eq('id', id);

      if (error) throw error;
      await load();
    } catch (e: any) {
      alert(e?.message || 'Falha ao eliminar');
    }
  }

  useEffect(() => {
    carregarEmpresaDoAdmin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!empresaId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  return (
    <main style={{ padding: 18 }}>
      <h1 className="h1" style={{ marginBottom: 12 }}>Fornecedores</h1>
      <p className="muted" style={{ marginTop: 0, marginBottom: 16 }}>
        Lista oficial por empresa.
        {loadingEmpresa ? ' (a carregar empresa...)' : empresaId ? '' : ' (empresa não carregada)'}
      </p>

      {/* Pesquisa + Recarregar + Adicionar */}
      <div
        className="card"
        style={{
          marginBottom: 12,
          display: 'grid',
          gap: 10,
          gridTemplateColumns: '1fr auto auto',
        }}
      >
        <input
          placeholder="Pesquisar por denominação, NIF, telefone, email, código…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
          style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 10 }}
          disabled={!empresaId || loadingEmpresa}
        />
        <button className="btn btn-ghost" onClick={load} disabled={loading || !empresaId || loadingEmpresa}>
          {loading ? 'A carregar…' : 'Recarregar'}
        </button>
        <a className="btn btn-primary" href="/adm/fornecedores/new" aria-disabled={!empresaId || loadingEmpresa}>
          Adicionar
        </a>
      </div>

      {/* Criação rápida */}
      <section className="card" style={{ marginBottom: 16 }}>
        <h2 className="h2">Criar rápido</h2>
        <form
          onSubmit={createQuick}
          style={{
            display: 'grid',
            gap: 12,
            gridTemplateColumns: '1fr 160px 180px 160px auto',
          }}
        >
          <input
            placeholder="Denominação"
            required
            value={newForm.denominacao}
            onChange={(e) => setNewForm((f) => ({ ...f, denominacao: e.target.value }))}
            style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 10 }}
            disabled={!empresaId || loadingEmpresa}
          />
          <input
            placeholder="NIF"
            value={newForm.nif}
            onChange={(e) => setNewForm((f) => ({ ...f, nif: e.target.value }))}
            style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 10 }}
            disabled={!empresaId || loadingEmpresa}
          />
          <input
            placeholder="Email"
            type="email"
            value={newForm.email}
            onChange={(e) => setNewForm((f) => ({ ...f, email: e.target.value }))}
            style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 10 }}
            disabled={!empresaId || loadingEmpresa}
          />
          <input
            placeholder="Telefone"
            value={newForm.telefone}
            onChange={(e) => setNewForm((f) => ({ ...f, telefone: e.target.value }))}
            style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 10 }}
            disabled={!empresaId || loadingEmpresa}
          />
          <button className="btn btn-primary" disabled={creating || !empresaId || loadingEmpresa} type="submit">
            {creating ? 'A criar…' : 'Criar'}
          </button>
        </form>
        {err && <p style={{ color: 'crimson', marginTop: 8 }}>{err}</p>}
      </section>

      {/* Tabela */}
      <section className="card">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: 8 }}>Código</th>
                <th style={{ padding: 8 }}>Denominação</th>
                <th style={{ padding: 8 }}>NIF</th>
                <th style={{ padding: 8 }}>Telefone</th>
                <th style={{ padding: 8 }}>Email</th>
                <th style={{ padding: 8 }}>Ativo</th>
                <th style={{ padding: 8, textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: 8 }}>{r.codigo || '—'}</td>
                  <td style={{ padding: 8 }}>{r.denominacao || '—'}</td>
                  <td style={{ padding: 8 }}>{r.nif || '—'}</td>
                  <td style={{ padding: 8 }}>{r.telefone || '—'}</td>
                  <td style={{ padding: 8 }}>{r.email || '—'}</td>
                  <td style={{ padding: 8 }}>{r.ativo ? 'Sim' : 'Não'}</td>
                  <td style={{ padding: 8, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <a
                      className="btn"
                      href={`/adm/fornecedores/${r.id}/edit`}
                      style={{
                        background: 'var(--brand-1)',
                        color: 'var(--brand-1-contrast)',
                        borderColor: 'transparent',
                        height: 34,
                        padding: '0 12px',
                      }}
                    >
                      Editar
                    </a>
                    <button
                      className="btn"
                      onClick={() => remove(r.id)}
                      style={{
                        marginLeft: 8,
                        background: 'transparent',
                        color: 'var(--brand-1)',
                        borderColor: 'var(--brand-2)',
                        height: 34,
                        padding: '0 12px',
                      }}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length && !loading && (
                <tr>
                  <td colSpan={7} style={{ padding: 12, color: '#666' }}>
                    Sem registos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {loading && (
          <p className="muted" style={{ marginTop: 10 }}>
            A carregar…
          </p>
        )}
      </section>
    </main>
  );
}