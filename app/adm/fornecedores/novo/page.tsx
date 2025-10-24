'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NovoFornecedorPage() {
  const router = useRouter();
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [emailUser, setEmailUser] = useState<string | null>(null);

  const [denominacao, setDenominacao] = useState('');
  const [nif, setNif] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [morada, setMorada] = useState('');
  const [cidade, setCidade] = useState('');
  const [pais, setPais] = useState('');

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supa.auth.getUser();
      if (!data.user) {
        router.replace('/login?next=' + encodeURIComponent('/adm/fornecedores/novo'));
        return;
      }
      setEmailUser(data.user.email ?? null);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    setSaving(true);
    try {
      // Trigger preencherá empresa_id via JWT; RLS checa empresa
      const payload = {
        denominacao: denominacao.trim() || null,
        nif: nif.trim() || null,
        email: email.trim() || null,
        telefone: telefone.trim() || null,
        morada: morada.trim() || null,
        cidade: cidade.trim() || null,
        pais: pais.trim() || null,
      };

      const { error } = await supa.from('fornecedores').insert(payload);
      if (error) throw error;

      setMsg('Fornecedor criado com sucesso!');
      // limpa campos
      setDenominacao('');
      setNif('');
      setEmail('');
      setTelefone('');
      setMorada('');
      setCidade('');
      setPais('');
      // volta para a lista
      setTimeout(() => router.replace('/adm/fornecedores'), 600);
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 24, fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Novo Fornecedor</h1>
        <div style={{ fontSize: 13, color: '#555' }}>{emailUser}</div>
      </div>

      <form onSubmit={salvar} style={{ display: 'grid', gap: 10, marginTop: 12 }}>
        <label>Denominação
          <input value={denominacao} onChange={(e) => setDenominacao(e.target.value)}
            required
            style={{ display: 'block', width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
          />
        </label>
        <label>NIF
          <input value={nif} onChange={(e) => setNif(e.target.value)}
            style={{ display: 'block', width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
          />
        </label>
        <label>Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            style={{ display: 'block', width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
          />
        </label>
        <label>Telefone
          <input value={telefone} onChange={(e) => setTelefone(e.target.value)}
            style={{ display: 'block', width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
          />
        </label>
        <label>Morada
          <input value={morada} onChange={(e) => setMorada(e.target.value)}
            style={{ display: 'block', width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
          />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label>Cidade
            <input value={cidade} onChange={(e) => setCidade(e.target.value)}
              style={{ display: 'block', width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
            />
          </label>
          <label>País
            <input value={pais} onChange={(e) => setPais(e.target.value)}
              style={{ display: 'block', width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
            />
          </label>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button disabled={saving}
            type="submit"
            style={{ padding: '10px 14px', border: '1px solid #111', background: '#111', color: '#fff', borderRadius: 8 }}>
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
          <Link href="/adm/fornecedores">
            <button type="button" style={{ padding: '10px 14px', border: '1px solid #ddd', background: '#fff', borderRadius: 8 }}>
              Voltar
            </button>
          </Link>
        </div>
      </form>

      {msg && <p style={{ marginTop: 8, color: '#14532d' }}>{msg}</p>}
      {err && <p style={{ marginTop: 8, color: '#7f1d1d' }}>Erro: {err}</p>}
    </div>
  );
}
