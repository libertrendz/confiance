'use client';

import { useEffect, useState } from 'react';

type Detail = {
  id: string;
  codigo: string | null;
  denominacao: string | null;
  tipo_fornecimento: string | null;
  nif: string | null;
  email: string | null;
  telefone: string | null;
  nome_contacto: string | null;
  morada: string | null;
  concelho: string | null;
  cod_postal: string | null;
  forma_pagamento: string | null;
  observacoes: string | null;
  ativo: boolean | null;
};

export default function FornecedorEditPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const [data, setData] = useState<Detail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/fornecedores/detail?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
      const j = await res.json();
      if (!res.ok || !j?.ok) throw new Error(j?.error || 'Falha ao carregar');
      setData(j.row);
    } catch (e: any) {
      setErr(e?.message || 'Falha ao carregar');
    } finally {
      setLoading(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch('/api/admin/fornecedores/update', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      });
      const j = await res.json();
      if (!res.ok || !j?.ok) throw new Error(j?.error || 'Falha ao guardar');
      alert('Guardado.');
      window.location.href = '/adm/fornecedores';
    } catch (e: any) {
      setErr(e?.message || 'Falha ao guardar');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  if (loading) return <main style={{ padding: 18 }}><p className="muted">A carregar…</p></main>;

  if (!data) {
    return (
      <main style={{ padding: 18 }}>
        <p style={{ color: 'crimson' }}>{err || 'Falha ao carregar'}</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 18 }}>
      <h1 className="h1" style={{ marginBottom: 12 }}>Editar fornecedor</h1>

      <form onSubmit={save} className="card" style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '160px 1fr 1fr' }}>
          <Input label="Código" value={data.codigo || ''} onChange={v => setData(d => d ? { ...d, codigo: v } : d)} />
          <Input label="Denominação" value={data.denominacao || ''} onChange={v => setData(d => d ? { ...d, denominacao: v } : d)} required />
          <Input label="Tipo fornecimento" value={data.tipo_fornecimento || ''} onChange={v => setData(d => d ? { ...d, tipo_fornecimento: v } : d)} />
        </div>

        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '160px 1fr 1fr' }}>
          <Input label="NIF" value={data.nif || ''} onChange={v => setData(d => d ? { ...d, nif: v } : d)} />
          <Input label="Email" type="email" value={data.email || ''} onChange={v => setData(d => d ? { ...d, email: v } : d)} />
          <Input label="Telefone" value={data.telefone || ''} onChange={v => setData(d => d ? { ...d, telefone: v } : d)} />
        </div>

        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr 160px' }}>
          <Input label="Nome contacto" value={data.nome_contacto || ''} onChange={v => setData(d => d ? { ...d, nome_contacto: v } : d)} />
          <Input label="Concelho" value={data.concelho || ''} onChange={v => setData(d => d ? { ...d, concelho: v } : d)} />
          <Input label="Cód. Postal" value={data.cod_postal || ''} onChange={v => setData(d => d ? { ...d, cod_postal: v } : d)} />
        </div>

        <Input label="Morada" value={data.morada || ''} onChange={v => setData(d => d ? { ...d, morada: v } : d)} />

        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
          <Input label="Forma pagamento" value={data.forma_pagamento || ''} onChange={v => setData(d => d ? { ...d, forma_pagamento: v } : d)} />
          <label className="muted" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={!!data.ativo}
              onChange={e => setData(d => d ? { ...d, ativo: e.target.checked } : d)}
            />
            Ativo
          </label>
        </div>

        <div>
          <label className="muted">Observações</label>
          <textarea
            value={data.observacoes || ''}
            onChange={e => setData(d => d ? { ...d, observacoes: e.target.value } : d)}
            style={{ width: '100%', padding: 10, border: '1px solid var(--border)', borderRadius: 10, minHeight: 100 }}
          />
        </div>

        {err && <p style={{ color: 'crimson' }}>{err}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" disabled={saving} type="submit">
            {saving ? 'A guardar…' : 'Guardar'}
          </button>
          <a className="btn btn-ghost" href="/adm/fornecedores">Cancelar</a>
        </div>
      </form>
    </main>
  );
}

function Input({
  label, value, onChange, type = 'text', required = false,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="muted">{label}{required ? ' *' : ''}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: 10, border: '1px solid var(--border)', borderRadius: 10 }}
      />
    </div>
  );
}
