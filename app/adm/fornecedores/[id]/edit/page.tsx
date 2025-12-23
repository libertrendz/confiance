// app/adm/fornecedores/[id]/edit/page.tsx
'use client';

import { useEffect, useState } from 'react';

export default function FornecedorEditPage({ params }: { params: { id: string } }) {
  const id = params?.id;
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    setMsg(null);
    try {
      if (!id) throw new Error('ID em falta');
      const res = await fetch(`/api/admin/fornecedores/get?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) throw new Error(`Resposta inválida do servidor (${res.status})`);
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Falha ao carregar');
      setForm(j);
    } catch (e: any) {
      setErr(e?.message || 'Falha ao carregar');
      setForm(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await load();
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    setMsg(null);

    try {
      const res = await fetch('/api/admin/fornecedores/update', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, id }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || 'Falha ao guardar');

      // recarrega do servidor para o form refletir o que ficou no DB
      await load();
      setMsg('Guardado.');
    } catch (e: any) {
      setErr(e?.message || 'Falha ao guardar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main style={{ padding: 18 }}>A carregar…</main>;
  if (!form) return <main style={{ padding: 18, color: 'crimson' }}>{err || 'Falha ao carregar'}</main>;

  return (
    <main style={{ padding: 18 }}>
      <h1 className="h1" style={{ marginBottom: 12 }}>Editar Fornecedor</h1>

      <form onSubmit={save} className="card" style={{ display: 'grid', gap: 12 }}>
        <div>
          <label className="muted">Denominação *</label>
          <input
            value={form.denominacao || ''}
            onChange={(e) => setForm((f: any) => ({ ...f, denominacao: e.target.value }))}
            required
            style={{ width: '100%', padding: 10, border: '1px solid var(--border)', borderRadius: 10 }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div>
            <label className="muted">NIF</label>
            <input
              value={form.nif || ''}
              onChange={(e) => setForm((f: any) => ({ ...f, nif: e.target.value }))}
              style={{ width: '100%', padding: 10, border: '1px solid var(--border)', borderRadius: 10 }}
            />
          </div>
          <div>
            <label className="muted">Telefone</label>
            <input
              value={form.telefone || ''}
              onChange={(e) => setForm((f: any) => ({ ...f, telefone: e.target.value }))}
              style={{ width: '100%', padding: 10, border: '1px solid var(--border)', borderRadius: 10 }}
            />
          </div>
          <div>
            <label className="muted">Email</label>
            <input
              value={form.email || ''}
              onChange={(e) => setForm((f: any) => ({ ...f, email: e.target.value }))}
              style={{ width: '100%', padding: 10, border: '1px solid var(--border)', borderRadius: 10 }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="muted">Tipo de fornecimento</label>
            <input
              value={form.tipo_fornecimento || ''}
              onChange={(e) => setForm((f: any) => ({ ...f, tipo_fornecimento: e.target.value }))}
              style={{ width: '100%', padding: 10, border: '1px solid var(--border)', borderRadius: 10 }}
            />
          </div>
          <div>
            <label className="muted">Nome do contacto</label>
            <input
              value={form.nome_contacto || ''}
              onChange={(e) => setForm((f: any) => ({ ...f, nome_contacto: e.target.value }))}
              style={{ width: '100%', padding: 10, border: '1px solid var(--border)', borderRadius: 10 }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
          <div>
            <label className="muted">Morada</label>
            <input
              value={form.morada || ''}
              onChange={(e) => setForm((f: any) => ({ ...f, morada: e.target.value }))}
              style={{ width: '100%', padding: 10, border: '1px solid var(--border)', borderRadius: 10 }}
            />
          </div>
          <div>
            <label className="muted">Concelho</label>
            <input
              value={form.concelho || ''}
              onChange={(e) => setForm((f: any) => ({ ...f, concelho: e.target.value }))}
              style={{ width: '100%', padding: 10, border: '1px solid var(--border)', borderRadius: 10 }}
            />
          </div>
          <div>
            <label className="muted">Código Postal</label>
            <input
              value={form.cod_postal || ''}
              onChange={(e) => setForm((f: any) => ({ ...f, cod_postal: e.target.value }))}
              placeholder="1234-567"
              style={{ width: '100%', padding: 10, border: '1px solid var(--border)', borderRadius: 10 }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="muted">Forma de pagamento</label>
            <select
              value={form.forma_pagamento || ''}
              onChange={(e) => setForm((f: any) => ({ ...f, forma_pagamento: e.target.value }))}
              style={{ width: '100%', padding: 10, border: '1px solid var(--border)', borderRadius: 10, background: '#fff' }}
            >
              <option value="">—</option>
              <option value="A VISTA">A VISTA</option>
              <option value="PARCELADO">PARCELADO</option>
            </select>
          </div>
          <div>
            <label className="muted">Ativo</label>
            <br />
            <input
              type="checkbox"
              checked={!!form.ativo}
              onChange={(e) => setForm((f: any) => ({ ...f, ativo: e.target.checked }))}
            />
          </div>
        </div>

        <div>
          <label className="muted">Observações</label>
          <textarea
            value={form.observacoes || ''}
            onChange={(e) => setForm((f: any) => ({ ...f, observacoes: e.target.value }))}
            style={{ width: '100%', padding: 10, border: '1px solid var(--border)', borderRadius: 10, minHeight: 90 }}
          />
        </div>

        {err && <p style={{ color: 'crimson', margin: 0 }}>{err}</p>}
        {msg && <p style={{ color: 'green', margin: 0 }}>{msg}</p>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" disabled={saving} type="submit">
            {saving ? 'A guardar…' : 'Guardar'}
          </button>
          <a className="btn btn-ghost" href="/adm/fornecedores">
            Voltar
          </a>
        </div>
      </form>
    </main>
  );
}
