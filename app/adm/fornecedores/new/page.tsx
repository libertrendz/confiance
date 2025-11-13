// app/adm/fornecedores/new/page.tsx
'use client';

import { useState } from 'react';

export default function FornecedorNewPage() {
  const [form, setForm] = useState({
    denominacao: '',
    nif: '',
    email: '',
    telefone: '',
    ativo: true,

    tipo_fornecimento: '',
    nome_contacto: '',
    morada: '',
    concelho: '',
    cod_postal: '',
    forma_pagamento: '', // 'A VISTA' | 'PARCELADO'
    observacoes: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string|null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErr(null);
    try {
      const res = await fetch('/api/admin/fornecedores/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Falha ao guardar');
      alert('Guardado.');
      window.location.replace('/adm/fornecedores');
    } catch (e:any) {
      setErr(e?.message || 'Falha ao guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ padding: 18 }}>
      <h1 className="h1" style={{ marginBottom: 12 }}>Adicionar Fornecedor</h1>
      <form onSubmit={save} className="card" style={{ display: 'grid', gap: 12 }}>
        <div>
          <label className="muted">Denominação *</label>
          <input value={form.denominacao} onChange={e=>setForm(f=>({...f, denominacao:e.target.value}))}
                 required style={{ width:'100%', padding:10, border:'1px solid var(--border)', borderRadius:10 }}/>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
          <div>
            <label className="muted">NIF</label>
            <input value={form.nif} onChange={e=>setForm(f=>({...f, nif:e.target.value}))}
                   style={{ width:'100%', padding:10, border:'1px solid var(--border)', borderRadius:10 }}/>
          </div>
          <div>
            <label className="muted">Telefone</label>
            <input value={form.telefone} onChange={e=>setForm(f=>({...f, telefone:e.target.value}))}
                   style={{ width:'100%', padding:10, border:'1px solid var(--border)', borderRadius:10 }}/>
          </div>
          <div>
            <label className="muted">Email</label>
            <input value={form.email} onChange={e=>setForm(f=>({...f, email:e.target.value}))}
                   style={{ width:'100%', padding:10, border:'1px solid var(--border)', borderRadius:10 }}/>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div>
            <label className="muted">Tipo de fornecimento</label>
            <input value={form.tipo_fornecimento} onChange={e=>setForm(f=>({...f, tipo_fornecimento:e.target.value}))}
                   style={{ width:'100%', padding:10, border:'1px solid var(--border)', borderRadius:10 }}/>
          </div>
          <div>
            <label className="muted">Nome do contacto</label>
            <input value={form.nome_contacto} onChange={e=>setForm(f=>({...f, nome_contacto:e.target.value}))}
                   style={{ width:'100%', padding:10, border:'1px solid var(--border)', borderRadius:10 }}/>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:12 }}>
          <div>
            <label className="muted">Morada</label>
            <input value={form.morada} onChange={e=>setForm(f=>({...f, morada:e.target.value}))}
                   style={{ width:'100%', padding:10, border:'1px solid var(--border)', borderRadius:10 }}/>
          </div>
          <div>
            <label className="muted">Concelho</label>
            <input value={form.concelho} onChange={e=>setForm(f=>({...f, concelho:e.target.value}))}
                   style={{ width:'100%', padding:10, border:'1px solid var(--border)', borderRadius:10 }}/>
          </div>
          <div>
            <label className="muted">Código Postal</label>
            <input value={form.cod_postal} onChange={e=>setForm(f=>({...f, cod_postal:e.target.value}))}
                   placeholder="1234-567"
                   style={{ width:'100%', padding:10, border:'1px solid var(--border)', borderRadius:10 }}/>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div>
            <label className="muted">Forma de pagamento</label>
            <select value={form.forma_pagamento}
              onChange={e=>setForm(f=>({...f, forma_pagamento:e.target.value}))}
              style={{ width:'100%', padding:10, border:'1px solid var(--border)', borderRadius:10, background:'#fff' }}>
              <option value="">—</option>
              <option value="A VISTA">A VISTA</option>
              <option value="PARCELADO">PARCELADO</option>
            </select>
          </div>
          <div>
            <label className="muted">Ativo</label><br/>
            <input type="checkbox" checked={form.ativo}
              onChange={e=>setForm(f=>({...f, ativo:e.target.checked}))}/>
          </div>
        </div>

        <div>
          <label className="muted">Observações</label>
          <textarea value={form.observacoes} onChange={e=>setForm(f=>({...f, observacoes:e.target.value}))}
                    style={{ width:'100%', padding:10, border:'1px solid var(--border)', borderRadius:10, minHeight:90 }}/>
        </div>

        {err && <p style={{ color:'crimson' }}>{err}</p>}
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-primary" disabled={saving} type="submit">{saving?'A guardar…':'Guardar'}</button>
          <a className="btn btn-ghost" href="/adm/fornecedores">Cancelar</a>
        </div>
      </form>
    </main>
  );
}
