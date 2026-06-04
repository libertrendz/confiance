/**
 * ============================================================
 * CONFIANCE ERP
 * Arquivo: app/adm/colaboradores/new/page.tsx
 * Módulo: Colaboradores
 * Página: Novo Colaborador
 * Rota: /adm/colaboradores/new
 *
 * Objetivo:
 * Criar colaborador já com a ficha inicial alinhada ao
 * Workspace RH e à edição do colaborador.
 *
 * Autor: Libertrendz
 * ============================================================
 */

'use client';

import { useState } from 'react';

type PerfilAcesso = '' | 'externo_ponto' | 'interno_total';

type FormState = {
  nome: string;
  nif: string;
  email: string;
  telefone: string;
  morada: string;
  data_nasc: string;

  tipo: string;
  funcao: string;
  categoria: string;
  contrato_tipo: string;

  custo_hora: string;
  iban: string;
  data_admissao: string;

  notas: string;

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

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 10,
  border: '1px solid var(--border)',
  borderRadius: 10,
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  background: '#fff',
};

const grid2: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 12,
};

export default function ColaboradorNewPage() {
  const [form, setForm] = useState<FormState>({
    nome: '',
    nif: '',
    email: '',
    telefone: '',
    morada: '',
    data_nasc: '',

    tipo: 'empregado',
    funcao: '',
    categoria: '',
    contrato_tipo: '',

    custo_hora: '',
    iban: '',
    data_admissao: '',

    notas: '',

    ativo: true,
    perfil_acesso: 'externo_ponto',
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
        morada: form.morada || null,
        data_nasc: form.data_nasc || null,

        tipo: form.tipo || null,
        funcao: form.funcao || null,
        categoria: form.categoria || null,
        contrato_tipo: form.contrato_tipo || null,

        custo_hora: form.custo_hora ? Number(form.custo_hora) : null,
        iban: form.iban || null,
        data_admissao: form.data_admissao || null,

        notas: form.notas || null,

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

      if (!j.ok) {
        throw new Error(j.error || 'Falha ao criar colaborador');
      }

      alert('Colaborador criado com sucesso.');
      window.location.replace(`/adm/colaboradores/${j.id}`);
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
        style={{ display: 'grid', gap: 12, maxWidth: 860 }}
      >
        <div>
          <label className="muted">Nome *</label>
          <input
            required
            value={form.nome}
            onChange={(e) =>
              setForm((f) => ({ ...f, nome: e.target.value }))
            }
            style={inputStyle}
          />
        </div>

        <div style={grid2}>
          <div>
            <label className="muted">NIF (9 dígitos)</label>
            <input
              value={form.nif}
              onChange={(e) =>
                setForm((f) => ({ ...f, nif: e.target.value }))
              }
              maxLength={9}
              style={inputStyle}
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
              style={inputStyle}
            />
          </div>
        </div>

        <div style={grid2}>
          <div>
            <label className="muted">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label className="muted">Data de nascimento</label>
            <input
              type="date"
              value={form.data_nasc}
              onChange={(e) =>
                setForm((f) => ({ ...f, data_nasc: e.target.value }))
              }
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label className="muted">Morada</label>
          <input
            value={form.morada}
            onChange={(e) =>
              setForm((f) => ({ ...f, morada: e.target.value }))
            }
            style={inputStyle}
          />
        </div>

        <div style={grid2}>
          <div>
            <label className="muted">Tipo</label>
            <select
              value={form.tipo}
              onChange={(e) =>
                setForm((f) => ({ ...f, tipo: e.target.value }))
              }
              style={selectStyle}
            >
              <option value="empregado">Empregado</option>
              <option value="externo">Externo</option>
            </select>
          </div>

          <div>
            <label className="muted">Função</label>
            <input
              value={form.funcao}
              onChange={(e) =>
                setForm((f) => ({ ...f, funcao: e.target.value }))
              }
              style={inputStyle}
            />
          </div>
        </div>

        <div style={grid2}>
          <div>
            <label className="muted">Categoria</label>
            <input
              value={form.categoria}
              onChange={(e) =>
                setForm((f) => ({ ...f, categoria: e.target.value }))
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label className="muted">Tipo de contrato</label>
            <input
              value={form.contrato_tipo}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  contrato_tipo: e.target.value,
                }))
              }
              style={inputStyle}
            />
          </div>
        </div>

        <div style={grid2}>
          <div>
            <label className="muted">Custo hora (€)</label>
            <input
              type="number"
              step="0.01"
              value={form.custo_hora}
              onChange={(e) =>
                setForm((f) => ({ ...f, custo_hora: e.target.value }))
              }
              style={inputStyle}
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
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label className="muted">IBAN</label>
          <input
            value={form.iban}
            onChange={(e) =>
              setForm((f) => ({ ...f, iban: e.target.value }))
            }
            style={inputStyle}
          />
        </div>

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
            style={selectStyle}
          >
            <option value="">Sem acesso ao sistema</option>
            <option value="externo_ponto">Externo (só ponto / mobile)</option>
            <option value="interno_total">Interno (sistema + ponto)</option>
          </select>
        </div>

        <div>
          <label className="muted">Notas</label>
          <textarea
            value={form.notas}
            onChange={(e) =>
              setForm((f) => ({ ...f, notas: e.target.value }))
            }
            rows={4}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
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
