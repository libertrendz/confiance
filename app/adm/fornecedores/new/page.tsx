'use client';
import { useState } from 'react';

export default function NewFornecedorPage() {
  const [form, setForm] = useState({
    denominacao: '',
    tipo_fornecimento: '',
    nif: '',
    email: '',
    telefone: '',
    nome_contacto: '',
    morada: '',
    concelho: '',
    cod_postal: '',
    forma_pagamento: '',
    observacoes: '',
    ativo: true,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string|null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErr(null);
    try {
      const res = await fetch('/api/admin/fornecedores/create', {
        method: 'POST',
        headers: { 'content-type':'application/json' },
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!res.ok || j?.error) throw new Error(j?.error || 'Falha ao criar');
      window.location.href = '/adm/fornecedores';
    } catch (e:any) {
      setErr(e?.message || 'Falha ao criar');
    } finally {
      setSaving(false);
    }
  }

  function set<K extends keyof typeof form>(k: K, v: any) {
    setForm(f => ({ ...f, [k]: v }));
  }

  const input = { width:'100%', padding:10, border:'1px solid var(--border)', borderRadius:10 } as const;

  return (
    <main style={{ padding: 18 }}>
      <h1 className="h1" style={{ marginBottom: 12 }}>Novo Fornecedor</h1>
      <form onSubmit={submit} className="card" style={{ display:'grid', gap:12 }}>
        <div><label className="muted">Denominação*</label>
          <input required value={form.denominacao} onChange={e=>set('denominacao', e.target.value)} style={input}/></div>
        <div><label className="muted">Tipo de fornecimento</label>
          <input value={form.tipo_fornecimento} onChange={e=>set('tipo_fornecimento', e.target.value)} style={input}/></div>
        <div style={{ display:'grid', gap:12, gridTemplateColumns:'1fr 1fr' }}>
          <div><label className="muted">NIF</label>
            <input value={form.nif} onChange={e=>set('nif', e.target.value)} style={input}/></div>
          <div><label className="muted">Telefone</label>
            <input value={form.telefone} onChange={e=>set('telefone', e.target.value)} style={input}/></div>
        </div>
        <div style={{ display:'grid', gap:12, gridTemplateColumns:'1fr 1fr' }}>
          <div><label className="muted">Email</label>
            <input value={form.email} onChange={e=>set('email', e.target.value)} style={input}/></div>
          <div><label className="muted">Nome do contacto</label>
            <input value={form.nome_contacto} onChange={e=>set('nome_contacto', e.target.value)} style={input}/></div>
        </div>
        <div><label className="muted">Morada</label>
          <input value={form.morada} onChange={e=>set('morada', e.target.value)} style={input}/></div>
        <div style={{ display:'grid', gap:12, gridTemplateColumns:'1fr 1fr' }}>
          <div><label className="muted">Concelho</label>
            <input value={form.concelho} onChange={e=>set('concelho', e.target.value)} style={input}/></div>
          <div><label className="muted">Código Postal</label>
            <input value={form.cod_postal} onChange={e=>set('cod_postal', e.target.value)} style={input}/></div>
        </div>
        <div style={{ display:'grid', gap:12, gridTemplateColumns:'1fr 1fr' }}>
          <div><label className="muted">Forma de pagamento</label>
            <select value={form.forma_pagamento} onChange={e=>set('forma_pagamento', e.target.value)} style={{ ...input, background:'#fff' }}>
              <option value="">—</option>
              <option value="à vista">à vista</option>
              <option value="parcelado">parcelado</option>
            </select></div>
          <div><label className="muted">Ativo</label>
            <select value={String(form.ativo)} onChange={e=>set('ativo', e.target.value === 'true')} style={{ ...input, background:'#fff' }}>
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </select></div>
        </div>
        <div><label className="muted">Observações</label>
          <textarea value={form.observacoes} onChange={e=>set('observacoes', e.target.value)} style={{ ...input, minHeight:100 }}/></div>

        {err && <p style={{ color:'crimson' }}>{err}</p>}
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <a className="btn btn-ghost" href="/adm/fornecedores">Cancelar</a>
          <button className="btn btn-primary" disabled={saving}>{saving ? 'A guardar…' : 'Guardar'}</button>
        </div>
      </form>
    </main>
  );
}
