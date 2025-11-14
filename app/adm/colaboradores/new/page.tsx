// app/adm/colaboradores/new/page.tsx
'use client';

import { useState } from 'react';

type PerfilAcesso = '' | 'externo_ponto' | 'interno_total';

type FormState = {
  nome: string;
  nif: string;
  email: string;
  telefone: string;
  tipo: string;
  custo_hora: string;
  data_admissao: string;
  ativo: boolean;
  perfil_acesso: PerfilAcesso;
};

function mapPerfilToFlags(perfil: PerfilAcesso) {
  switch (perfil) {
    case 'externo_ponto':
      return { pode_aceder_sistema: false, pode_registar_ponto: true };
    case 'interno_total':
      return { pode_aceder_sistema: true, pode_registar_ponto: true };
    default:
      return { pode_aceder_sistema: false, pode_registar_ponto: false };
  }
}

export default function ColaboradorNewPage() {
  const [form, setForm] = useState<FormState>({
    nome: '',
    nif: '',
    email: '',
    telefone: '',
    tipo: 'empregado',
    custo_hora: '',
    data_admissao: '',
    ativo: true,
    perfil_acesso: 'externo_ponto', // padrão: externo, só ponto
  });

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const flags = mapPerfilToFlags(form.perfil_acesso);

      const payload = {
        nome: form.nome,
        nif: form.nif || null,
        email: form.email || null,
        telefone: form.telefone || null,
        tipo: form.tipo || null,
        custo_hora: form.custo_hora ? Number(form.custo_hora) : null,
        data_admissao: form.data_admissao || null,
        ativo: form.ativo,
        ...flags,
      };

      const res = await fetch('/api/admin/colaboradores/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        throw new Error(`Resposta inválida do servidor (${res.status})`);
      }
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'Falha ao criar colaborador');

      alert('Colaborador criado com sucesso.');
      window.location.replace('/adm/colaboradores');
    } catch (e: any) {
      setErr(e?.message || 'Falha ao criar colaborador');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ padding: 18 }}>
      <h1 className="h1" style={{ marginBottom: 12 }}>
        Novo colaborador
      </h1>

      <form
        onSubmit={save}
        className="card"
        style={{ display: 'grid', gap: 12, maxWidth: 720 }}
      >
        <div>
          <label className="muted">Nome *</label>
          <input
            required
            value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            style={{
              width: '100%',
              padding: 10,
              border: '1px solid var(--border)',
              borderRadius: 10,
            }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="muted">NIF (9 dígitos)</label>
            <input
              value={form.nif}
              onChange={(e) => setForm((f) => ({ ...f, nif: e.target.value }))}
              maxLength={9}
              style={{
                width: '100%',
                padding: 10,
                border: '1px solid var(--border)',
                borderRadius: 10,
              }}
            />
          </div>
          <div>
            <label className="muted">Telefone (9 dígitos)</label>
            <input
              value={form.telefone}
              onChange={(e) =>
                setForm((f) => ({ ...f, telefone: e.target.value }))
              }
              maxLength={9}
              style={{
                width: '100%',
                padding: 10,
                border: '1px solid var(--border)',
                borderRadius: 10,
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="muted">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              style={{
                width: '100%',
                padding: 10,
                border: '1px solid var(--border)',
                borderRadius: 10,
              }}
            />
          </div>
          <div>
            <label className="muted">Tipo</label>
            <select
              value={form.tipo}
              onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
              style={{
                width: '100%',
                padding: 10,
                border: '1px solid var(--border)',
                borderRadius: 10,
                background: '#fff',
              }}
            >
              <option value="empregado">Empregado</option>
              <option value="externo">Externo</option>
            </select>
          </div>
        </div>

        {/* PERFIL DE ACESSO */}
        <div>
          <label className="muted">Perfil de acesso</label>
          <select
            value={form.perfil_acesso}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                perfil_acesso: e.target.value as PerfilAcesso,
              }))
            }
            style={{
              width: '100%',
              padding: 10,
              border: '1px solid var(--border)',
              borderRadius: 10,
              background: '#fff',
            }}
          >
            <option value="">Sem acesso ao sistema</option>
            <option value="externo_ponto">Externo (só ponto / mobile)</option>
            <option value="interno_total">Interno (sistema + ponto)</option>
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="muted">Custo hora (€)</label>
            <input
              type="number"
              step="0.01"
              value={form.custo_hora}
              onChange={(e) =>
                setForm((f) => ({ ...f, custo_hora: e.target.value }))
              }
              style={{
                width: '100%',
                padding: 10,
                border: '1px solid var(--border)',
                borderRadius: 10,
              }}
            />
          </div>
          <div>
            <label className="muted">Data de admissão</label>
            <input
              type="date"
              value={form.data_admissao}
              onChange={(e) =>
                setForm((f) => ({ ...f, data_admissao: e.target.value }))
              }
              style={{
                width: '100%',
                padding: 10,
                border: '1px solid var(--border)',
                borderRadius: 10,
              }}
            />
          </div>
        </div>

        <div>
          <label className="muted">
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(e) =>
                setForm((f) => ({ ...f, ativo: e.target.checked }))
              }
              style={{ marginRight: 6 }}
            />
            Ativo
          </label>
        </div>

        {err && <p style={{ color: 'crimson' }}>{err}</p>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'A guardar…' : 'Guardar'}
          </button>
          <a href="/adm/colaboradores" className="btn btn-ghost">
            Cancelar
          </a>
        </div>
      </form>
    </main>
  );
}
