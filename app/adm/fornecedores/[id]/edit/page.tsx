'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type FormaPagamento = 'A VISTA' | 'PARCELADO';

type Fornecedor = {
  id: string;
  codigo: string | null;
  denominacao: string;
  tipo_fornecimento: string | null;
  nif: string | null;
  email: string | null;
  telefone: string | null;
  nome_contacto: string | null;
  morada: string | null;
  concelho: string | null;
  cod_postal: string | null;
  forma_pagamento: FormaPagamento | null;
  observacoes: string | null;
  ativo: boolean;
};

const INPUT: React.CSSProperties = { width:'100%', padding:10, border:'1px solid var(--border)', borderRadius:10 };
const LABEL: React.CSSProperties = { display:'block', marginBottom:6, color:'var(--muted)', fontSize:12, fontWeight:600 };

export default function FornecedorEditPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const id = sp.get('id');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState<Fornecedor | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!id) { setErr('ID em falta.'); setLoading(false); return; }
      try {
        const res = await fetch(`/api/admin/fornecedores/detail?id=${encodeURIComponent(id)}`, { cache:'no-store' });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error || 'Falha ao carregar');
        const f = j as Fornecedor;
        if (!alive) return;
        setForm({
          ...f,
          forma_pagamento: (f.forma_pagamento === 'PARCELADO' ? 'PARCELADO' : 'A VISTA'),
        });
      } catch (e:any) {
        setErr(e?.message || 'Falha ao carregar');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  function v<T extends keyof Fornecedor>(k:T, val:Fornecedor[T]) {
    setForm(f => f ? { ...f, [k]: val } : f);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true); setErr(null);
    try {
      const res = await fetch('/api/admin/fornecedores/update', {
        method:'POST',
        headers:{ 'content-type':'application/json' },
        body: JSON.stringify({
          id: form.id,
          denominacao: form.denominacao,
          tipo_fornecimento: form.tipo_fornecimento,
          nif: form.nif,
          email: form.email,
          telefone: form.telefone,
          nome_contacto: form.nome_contacto,
          morada: form.morada,
          concelho: form.concelho,
          cod_postal: form.cod_postal,
          forma_pagamento: form.forma_pagamento, // 'A VISTA' | 'PARCELADO'
          observacoes: form.observacoes,
          ativo: form.ativo,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Falha ao guardar');
      router.replace('/adm/fornecedores'); // volta à lista
    } catch (e:any) {
      setErr(e?.message || 'Falha ao guardar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main style={{ padding:18 }}><p className="muted">A carregar…</p></main>;
  if (err) return <main style={{ padding:18 }}><p style={{ color:'crimson' }}>{err}</p></main>;
  if (!form) return <main style={{ padding:18 }}><p style={{ color:'crimson' }}>Fornecedor não encontrado.</p></main>;

  return (
    <main style={{ padding:18 }}>
      <h1 className="h1" style={{ marginBottom:12 }}>Editar Fornecedor {form.codigo ? `· ${form.codigo}` : ''}</h1>

      <form onSubmit={onSubmit} className="card" style={{ display:'grid', gap:12 }}>
        <div className="grid" style={{ gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div>
            <label style={LABEL}>Denominação *</label>
            <input style={INPUT} value={form.denominacao} onChange={e=>v('denominacao', e.target.value)} required />
          </div>
          <div>
            <label style={LABEL}>Tipo de fornecimento</label>
            <input style={INPUT} value={form.tipo_fornecimento ?? ''} onChange={e=>v('tipo_fornecimento', e.target.value)} />
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
          <div>
            <label style={LABEL}>NIF (9 dígitos)</label>
            <input style={INPUT} value={form.nif ?? ''} onChange={e=>v('nif', e.target.value)} inputMode="numeric" />
          </div>
          <div>
            <label style={LABEL}>Telefone (9 dígitos)</label>
            <input style={INPUT} value={form.telefone ?? ''} onChange={e=>v('telefone', e.target.value)} inputMode="tel" />
          </div>
          <div>
            <label style={LABEL}>Email</label>
            <input style={INPUT} value={form.email ?? ''} onChange={e=>v('email', e.target.value)} type="email" />
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns:'2fr 1fr 1fr', gap:12 }}>
          <div>
            <label style={LABEL}>Morada</label>
            <input style={INPUT} value={form.morada ?? ''} onChange={e=>v('morada', e.target.value)} />
          </div>
          <div>
            <label style={LABEL}>Concelho</label>
            <input style={INPUT} value={form.concelho ?? ''} onChange={e=>v('concelho', e.target.value)} />
          </div>
          <div>
            <label style={LABEL}>Código Postal (XXXX-XXX)</label>
            <input style={INPUT} value={form.cod_postal ?? ''} onChange={e=>v('cod_postal', e.target.value)} placeholder="0000-000" />
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div>
            <label style={LABEL}>Forma de pagamento</label>
            <select
              style={INPUT as any}
              value={form.forma_pagamento ?? 'A VISTA'}
              onChange={e=>v('forma_pagamento', e.target.value as FormaPagamento)}
            >
              <option value="A VISTA">A VISTA</option>
              <option value="PARCELADO">PARCELADO</option>
            </select>
          </div>
          <div>
            <label style={LABEL}>Ativo</label>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <input id="ativo" type="checkbox" checked={!!form.ativo} onChange={e=>v('ativo', e.target.checked)} />
              <label htmlFor="ativo">Fornecedor ativo</label>
            </div>
          </div>
        </div>

        <div>
          <label style={LABEL}>Observações</label>
          <textarea style={{ ...INPUT, minHeight: 90 }} value={form.observacoes ?? ''} onChange={e=>v('observacoes', e.target.value)} />
        </div>

        {err && <p style={{ color:'crimson' }}>{err}</p>}

        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <a className="btn btn-ghost" href="/adm/fornecedores">Cancelar</a>
          <button className="btn btn-primary" disabled={saving} type="submit">
            {saving ? 'A guardar…' : 'Guardar'}
          </button>
        </div>
      </form>
    </main>
  );
}
