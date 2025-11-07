// app/adm/utilizadores/convite/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

export const dynamic = 'force-dynamic';

type Papel = 'admin' | 'gestor' | 'externo';

export default function ConvitePage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [papel, setPapel] = useState<Papel>('externo');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Empresa do admin (do próprio profile)
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: s } = await supa.auth.getSession();
        if (!s.session) {
          window.location.replace('/login');
          return;
        }
        const uid = s.session.user.id;

        // lê o próprio profile para obter empresa_id
        const { data, error } = await supa
          .from('profiles')
          .select('empresa_id, papel')
          .eq('user_id', uid)
          .single();

        if (error) throw error;
        if (!alive) return;

        if (data?.papel !== 'admin') {
          setErr('Apenas administradores podem convidar.');
          return;
        }
        setEmpresaId(data.empresa_id as string);
      } catch (e: any) {
        setErr(e?.message ?? 'Falha ao carregar empresa do administrador.');
      }
    })();
    return () => { alive = false; };
  }, [supa]);

  async function enviarConvite(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);

    if (!empresaId) {
      setErr('Empresa não encontrada para o administrador.');
      return;
    }
    setLoading(true);
    try {
      // 1) Grava convite
      const { error: e1 } = await supa.from('user_invites').upsert({
        empresa_id: empresaId,
        email: email.trim(),
        nome: nome.trim() || null,
        papel,
      }, { onConflict: 'empresa_id,email' });
      if (e1) throw e1;

      // 2) Envia magic link de login
      const redirect = `${window.location.origin}/auth/confirm?next=/menu`;
      const { error: e2 } = await supa.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirect },
      });
      if (e2) throw e2;

      setMsg('Convite enviado! O utilizador deve abrir o link por um navegador (se o app de email usar webview, selecione “Abrir no navegador”).');
      setEmail('');
      setNome('');
      setPapel('externo');
    } catch (e: any) {
      setErr(e?.message ?? 'Falha ao enviar convite.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 18, fontFamily: 'system-ui', maxWidth: 560 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#0A3D91' }}>
        Convidar novo utilizador
      </h1>
      <p style={{ marginTop: 0, color: '#49546A' }}>
        Envia um magic link e pré-configura papel/nome. Ao abrir o link, o perfil é criado/ajustado automaticamente.
      </p>

      <form onSubmit={enviarConvite} style={{ marginTop: 12 }}>
        <label>Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />

        <label style={{ marginTop: 12 }}>Nome (exibição)</label>
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          style={inputStyle}
          placeholder="Ex.: João Silva"
        />

        <label style={{ marginTop: 12 }}>Papel</label>
        <select
          value={papel}
          onChange={(e) => setPapel(e.target.value as Papel)}
          style={inputStyle}
        >
          <option value="externo">Externo (colaborador)</option>
          <option value="gestor">Gestor</option>
          <option value="admin">Administrador</option>
        </select>

        <button type="submit" disabled={loading || !email.trim()}
          style={primaryBtnStyle}>
          {loading ? 'A enviar…' : 'Enviar convite'}
        </button>
      </form>

      {msg && <p style={{ color: 'green', marginTop: 12 }}>{msg}</p>}
      {err && <p style={{ color: 'crimson', marginTop: 12 }}>{err}</p>}
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: 10, borderRadius: 10, border: '1px solid #D7E3FF', marginTop: 6
};
const primaryBtnStyle: React.CSSProperties = {
  marginTop: 14, padding: '10px 14px', borderRadius: 10, border: 'none', background: '#0A3D91', color: '#fff', cursor: 'pointer'
};
