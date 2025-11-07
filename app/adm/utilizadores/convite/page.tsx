'use client';

import { useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

export default function ConvitePage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [email, setEmail] = useState('');
  const [papel, setPapel] = useState<'externo'|'gestor'|'admin'>('externo');
  const [nome, setNome] = useState('');
  const [nomeExib, setNomeExib] = useState('');
  const [msg, setMsg] = useState<string|null>(null);
  const [err, setErr] = useState<string|null>(null);
  const [sending, setSending] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null); setErr(null); setSending(true);
    try {
      // Pega empresa_id do profile do admin atual
      const { data: me } = await supa.auth.getUser();
      const user_id = me.user?.id;
      if (!user_id) throw new Error('Sem sessão');

      const { data: prof, error: profErr } = await supa
        .from('profiles')
        .select('empresa_id')
        .eq('user_id', user_id)
        .single();
      if (profErr) throw profErr;
      const empresa_id = prof?.empresa_id;
      if (!empresa_id) throw new Error('empresa_id ausente no teu perfil');

      const res = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          papel,
          empresa_id,
          nome: nome.trim() || null,
          nome_exibicao: nomeExib.trim() || null
        })
      });
      const js = await res.json();
      if (!res.ok) throw new Error(js?.error || 'Falha ao convidar');

      setMsg(`Convite enviado para ${email}.`);
      setEmail(''); setNome(''); setNomeExib('');
      setPapel('externo');
    } catch (e: any) {
      setErr(e?.message || 'Erro ao convidar');
    } finally {
      setSending(false);
    }
  }

  return (
    <main style={{ padding: 18, fontFamily: 'system-ui', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Convidar utilizador</h1>
      <form onSubmit={enviar} style={{ display: 'grid', gap: 12, maxWidth: 520 }}>
        <label>
          <div>Email</div>
          <input type="email" required value={email} onChange={e=>setEmail(e.target.value)}
            style={{ width:'100%', padding:10, border:'1px solid #ddd', borderRadius:10 }} />
        </label>

        <label>
          <div>Nome (interno)</div>
          <input type="text" value={nome} onChange={e=>setNome(e.target.value)}
            placeholder="Ex.: João Silva"
            style={{ width:'100%', padding:10, border:'1px solid #ddd', borderRadius:10 }} />
        </label>

        <label>
          <div>Nome a exibir</div>
          <input type="text" value={nomeExib} onChange={e=>setNomeExib(e.target.value)}
            placeholder="Ex.: João"
            style={{ width:'100%', padding:10, border:'1px solid #ddd', borderRadius:10 }} />
        </label>

        <label>
          <div>Papel</div>
          <select value={papel} onChange={e=>setPapel(e.target.value as any)}
            style={{ width:'100%', padding:10, border:'1px solid #ddd', borderRadius:10 }}>
            <option value="externo">Externo (Colaborador)</option>
            <option value="gestor">Gestor</option>
            <option value="admin">Admin</option>
          </select>
        </label>

        <button type="submit" disabled={sending || !email.trim()}
          style={{ padding:'10px 14px', borderRadius:10, border:'none', background:'#0A3D91', color:'#fff', cursor:'pointer', opacity: sending ? .7 : 1 }}>
          {sending ? 'Enviando…' : 'Enviar convite'}
        </button>

        {msg && <p style={{ color:'green' }}>{msg}</p>}
        {err && <p style={{ color:'crimson' }}>{err}</p>}
      </form>
    </main>
  );
}
