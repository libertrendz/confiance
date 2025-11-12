'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type FormaPagamento = 'À VISTA' | 'PARCELADO';

export default function FornecedorNewPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [denominacao, setDenominacao] = useState('');
  const [tipo_fornecimento, setTipoFornecimento] = useState('');
  const [nif, setNif] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [nome_contacto, setNomeContacto] = useState('');
  const [morada, setMorada] = useState('');
  const [concelho, setConcelho] = useState('');
  const [cod_postal, setCodPostal] = useState('');
  const [forma_pagamento, setFormaPagamento] = useState<FormaPagamento>('À VISTA');
  const [observacoes, setObservacoes] = useState('');
  const [ativo, setAtivo] = useState(true);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch('/api/admin/fornecedores/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          denominacao,
          tipo_fornecimento,
          nif,
          email,
          telefone,
          nome_contacto,
          morada,
          concelho,
          cod_postal,
          forma_pagamento, // já vem em MAIÚSCULAS
          observacoes,
          ativo,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Falha ao criar fornecedor');
      router.replace('/adm/fornecedores');
    } catch (e: any) {
      setErr(e?.message || 'Falha ao criar fornecedor');
    } finally {
      setSaving(false);
    }
  }

  const input = { width: '100%', padding: 10, border: '1px solid var(--border)', borderRadius: 10 } as const;
  const label = { display: 'block', marginBottom: 6, color: 'var(--muted)', fontSize: 12, fontWeight: 600 } as const;

  return (
    <main style={{ padding: 18 }}>
      <h1 className="h1" style={{ marginBottom: 12 }}>Adicionar Fornecedor</h1>

      <form onSubmit={onSubmit} className="card" style={{ display: 'grid', gap: 12 }}>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={label}>Denominação *</label>
            <input style={input} value={denominacao} onChange={e=>setDenominacao(e.target.value)} required />
          </div>
          <div>
            <label style={label}>Tipo de fornecimento</label>
            <input style={input} value={tipo_fornecimento} onChange={e=>setTipoFornecimento(e.target.value)} />
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div>
            <label style={label}>NIF (9 dígitos)</label>
            <input style={input} value={nif} onChange={e=>setNif(e.target.value)} inputMode="numeric" />
          </div>
          <div>
            <label style={label}>Telefone (9 dígitos)</label>
            <input style={input} value={telefone} onChange={e=>setTelefone(e.target.value)} inputMode="tel" />
          </div>
          <div>
            <label style={label}>Email</label>
            <input style={input} value={email} onChange={e=>setEmail(e.target.value)} type="email" />
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
          <div>
            <label style={label}>Morada</label>
            <input style={input} value={morada} onChange={e=>setMorada(e.target.value)} />
          </div>
          <div>
            <label style={label}>Concelho</label>
            <input style={input} value={concelho} onChange={e=>setConcelho(e.target.value)} />
          </div>
          <div>
            <label style={label}>Código Postal (XXXX-XXX)</label>
            <input style={input} value={cod_postal} onChange={e=>setCodPostal(e.target.value)} placeholder="0000-000" />
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={label}>Forma de pagamento</label>
            <select
              style={input as any}
              value={forma_pagamento}
              onChange={e=>setFormaPagamento(e.target.value as FormaPagamento)}
            >
              <option value="À VISTA">À VISTA</option>
              <option value="PARCELADO">PARCELADO</option>
            </select>
          </div>
          <div>
            <label style={label}>Ativo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input id="ativo" type="checkbox" checked={ativo} onChange={e=>setAtivo(e.target.checked)} />
              <label htmlFor="ativo">Fornecedor ativo</label>
            </div>
          </div>
        </div>

        <div>
          <label style={label}>Observações</label>
          <textarea style={{ ...input, minHeight: 90 }} value={observacoes} onChange={e=>setObservacoes(e.target.value)} />
        </div>

        {err && <p style={{ color: 'crimson' }}>{err}</p>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <a className="btn btn-ghost" href="/adm/fornecedores">Cancelar</a>
          <button className="btn btn-primary" disabled={saving} type="submit">
            {saving ? 'A guardar…' : 'Guardar'}
          </button>
        </div>
      </form>
    </main>
  );
}
