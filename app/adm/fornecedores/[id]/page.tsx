'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';
import { useSearchParams } from 'next/navigation';

type Row = {
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
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [row, setRow] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supa
        .from('fornecedores')
        .select('*')
        .eq('id', params.id)
        .maybeSingle();
      if (!alive) return;
      if (error) setErr(error.message);
      setRow(data as any);
    })();
    return () => { alive = false; };
  }, [supa, params.id]);

  async function guardar() {
    if (!row) return;
    setSaving(true); setErr(null); setMsg(null);
    try {
      const res = await fetch('/api/admin/fornecedores/update', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: row.id,
          denominacao: row.denominacao,
          tipo_fornecimento: row.tipo_fornecimento,
          nif: row.nif,
          email: row.email,
          telefone: row.telefone,
          nome_contacto: row.nome_contacto,
          morada: row.morada,
          concelho: row.concelho,
          cod_postal: row.cod_postal,
          forma_pagamento: row.forma_pagamento,
          observacoes: row.observacoes,
          ativo: row.ativo ?? true,
        }),
      });
      const j = await res.json();
      if (!res.ok || j?.error) throw new Error(j?.error || 'Falha ao atualizar');
      setMsg('Guardado.');
    } catch (e: any) {
      setErr(e?.message || 'Falha ao guardar');
    } finally {
      setSaving(false);
    }
  }

  if (!row) return <main style={{padding:18}}><p className="muted">A carregar…</p></main>;

  return (
    <main style={{ padding: 18 }}>
      <h1 className="h1" style={{ marginBottom: 12 }}>Fornecedor {row.codigo ? `(${row.codigo})` : ''}</h1>

      <section className="card" style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
        <Field label="Denominação">
          <input value={row.denominacao ?? ''} onChange={e=>setRow({...row, denominacao:e.target.value})}
            style={input} />
        </Field>
        <Field label="Tipo de fornecimento">
          <input value={row.tipo_fornecimento ?? ''} onChange={e=>setRow({...row, tipo_fornecimento:e.target.value})}
            style={input} />
        </Field>
        <Field label="NIF">
          <input value={row.nif ?? ''} onChange={e=>setRow({...row, nif:e.target.value})}
            style={input} />
        </Field>
        <Field label="Email">
          <input value={row.email ?? ''} onChange={e=>setRow({...row, email:e.target.value})}
            style={input} />
        </Field>
        <Field label="Telefone">
          <input value={row.telefone ?? ''} onChange={e=>setRow({...row, telefone:e.target.value})}
            style={input} />
        </Field>
        <Field label="Nome de contacto">
          <input value={row.nome_contacto ?? ''} onChange={e=>setRow({...row, nome_contacto:e.target.value})}
            style={input} />
        </Field>
        <Field label="Morada">
          <input value={row.morada ?? ''} onChange={e=>setRow({...row, morada:e.target.value})}
            style={input} />
        </Field>
        <Field label="Concelho">
          <input value={row.concelho ?? ''} onChange={e=>setRow({...row, concelho:e.target.value})}
            style={input} />
        </Field>
        <Field label="Código Postal">
          <input value={row.cod_postal ?? ''} onChange={e=>setRow({...row, cod_postal:e.target.value})}
            style={input} />
        </Field>
        <Field label="Forma de pagamento">
          <select value={row.forma_pagamento ?? ''} onChange={e=>setRow({...row, forma_pagamento:e.target.value})}
            style={input}>
            <option value="">—</option>
            <option value="à vista">à vista</option>
            <option value="parcelado">parcelado</option>
          </select>
        </Field>
        <Field label="Ativo">
          <input type="checkbox" checked={!!row.ativo}
            onChange={e=>setRow({...row, ativo:e.target.checked})} />
        </Field>
        <Field label="Observações" full>
          <textarea value={row.observacoes ?? ''} onChange={e=>setRow({...row, observacoes:e.target.value})}
            style={{...input, height: 100 }} />
        </Field>
      </section>

      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" onClick={guardar} disabled={saving}>{saving?'A guardar…':'Guardar'}</button>
        <a className="btn btn-ghost" href="/adm/fornecedores">Cancelar</a>
      </div>
      {err && <p style={{ color:'crimson', marginTop:8 }}>{err}</p>}
      {msg && <p style={{ color:'green', marginTop:8 }}>{msg}</p>}
    </main>
  );
}

function Field({ label, children, full=false }:{label:string, children:any, full?:boolean}) {
  return (
    <div style={{ display:'grid', gap:6, gridColumn: full ? '1 / -1' : undefined }}>
      <label className="muted">{label}</label>
      {children}
    </div>
  );
}
const input: React.CSSProperties = { width:'100%', padding:10, border:'1px solid var(--border)', borderRadius:10, background:'#fff' };
