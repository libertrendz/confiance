'use client';

import { useState } from 'react';

export default function ConvitePage() {
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [papel, setPapel] = useState<'admin'|'gestor'|'externo'>('externo');
  const [empresaId, setEmpresaId] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function convidar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null); setErr(null); setLoading(true);
    try {
      const res = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          nome: nome.trim() || null,
          papel,
          empresa_id: empresaId.trim() || null,
        }),
      });
      const js = await res.json();
      if (!res.ok || !js.ok) throw new Error(js.error || 'Falha no convite');
      setMsg('Convite enviado com sucesso.');
      setEmail(''); setNome('');
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao convidar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 18, fontFamily: 'system-ui', maxWidth: 760 }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0e3258' }}>Convidar utilizador</h1>
      <p style={{ color: '#445' }}>Cria um utilizador e envia o e-mail de confirmação.</p>

      <form onSubmit={convidar} style={{ display: 'grid', gap: 12, maxWidth: 520, marginTop: 12 }}>
        <label>
          <div>Email</div>
          <input type="email" required value={email} onChange={e=>setEmail(e.target.value)}
                 style={{ width:'100%', padding:10, border:'1px solid #d9e1ee', borderRadius:10 }} />
        </label>
        <label>
          <div>Nome</div>
          <input value={nome} onChange={e=>setNome(e.target.value)}
                 style={{ width:'100%', padding:10, border:'1px solid #d9e1ee', borderRadius:10 }} />
        </label>
        <label>
          <div>Papel</div>
          <select value={papel} onChange={e=>setPapel(e.target.value as any)}
                  style={{ width:'100%', padding:10, border:'1px solid #d9e1ee', borderRadius:10 }}>
            <option value="externo">Externo</option>
            <option value="gestor">Gestor</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <label>
          <div>Empresa (opcional)</div>
          <input value={empresaId} onChange={e=>setEmpresaId(e.target.value)}
                 placeholder="uuid da empresa"
                 style={{ width:'100%', padding:10, border:'1px solid #d9e1ee', borderRadius:10 }} />
        </label>

        <button type="submit" disabled={loading || !email.trim()}
                style={{ padding:'10px 14px', borderRadius:10, border:'none', background:'#0e3258', color:'#fff', fontWeight:700 }}>
          {loading ? 'A enviar…' : 'Convidar'}
        </button>

        {msg && <p style={{ color:'green' }}>{msg}</p>}
        {err && <p style={{ color:'crimson' }}>{err}</p>}
      </form>
    </main>
  );
}
