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

import { useEffect, useState } from 'react';

type PerfilAcesso = '' | 'externo_ponto' | 'interno_total';
type SalarioTipo = 'hora' | 'dia' | 'mensal';

type CatalogItem = {
  id: string;
  nome: string;
};

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

  salario_tipo: SalarioTipo;
  custo_hora: string;
  custo_dia: string;
  salario_atual: string;

  iban: string;
  data_admissao: string;
  data_saida: string;

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

function toNumberOrNull(value: string) {
  if (!value || value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function fetchCatalog(endpoint: string): Promise<CatalogItem[]> {
  const res = await fetch(endpoint, { cache: 'no-store' });
  const ct = res.headers.get('content-type') || '';

  if (!ct.includes('application/json')) {
    throw new Error(`Resposta inválida do servidor (${res.status})`);
  }

  const j = await res.json();

  if (!j.ok) {
    throw new Error(j.error || 'Falha ao carregar catálogo RH');
  }

  return j.rows || [];
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

const sectionTitleStyle: React.CSSProperties = {
  fontWeight: 700,
  marginTop: 6,
  marginBottom: 2,
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

    salario_tipo: 'mensal',
    custo_hora: '',
    custo_dia: '',
    salario_atual: '',

    iban: '',
    data_admissao: '',
    data_saida: '',

    notas: '',

    ativo: true,
    perfil_acesso: 'externo_ponto',
  });

  const [funcoes, setFuncoes] = useState<CatalogItem[]>([]);
  const [categorias, setCategorias] = useState<CatalogItem[]>([]);
  const [contratos, setContratos] = useState<CatalogItem[]>([]);

  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const [f, c, t] = await Promise.all([
          fetchCatalog('/api/admin/rh/funcoes/list'),
          fetchCatalog('/api/admin/rh/categorias/list'),
          fetchCatalog('/api/admin/rh/contratos/list'),
        ]);

        if (alive) {
          setFuncoes(f);
          setCategorias(c);
          setContratos(t);
        }
      } catch (e: any) {
        if (alive) setErr(e?.message || 'Falha ao carregar catálogos RH');
      } finally {
        if (alive) setLoadingCatalogs(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

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

        salario_tipo: form.salario_tipo,
        custo_hora:
          form.salario_tipo === 'hora'
            ? toNumberOrNull(form.custo_hora)
            : null,
        custo_dia:
          form.salario_tipo === 'dia'
            ? toNumberOrNull(form.custo_dia)
            : null,
        salario_atual:
          form.salario_tipo === 'mensal'
            ? toNumberOrNull(form.salario_atual)
            : null,

        iban: form.iban || null,

        data_admissao: form.data_admissao || null,
        data_saida: form.data_saida || null,

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
        <div style={sectionTitleStyle}>Dados pessoais</div>

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

        <div style={sectionTitleStyle}>Dados profissionais</div>

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
            <select
              value={form.funcao}
              onChange={(e) =>
                setForm((f) => ({ ...f, funcao: e.target.value }))
              }
              style={selectStyle}
              disabled={loadingCatalogs}
            >
              <option value="">—</option>
              {funcoes.map((item) => (
                <option key={item.id} value={item.nome}>
                  {item.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={grid2}>
          <div>
            <label className="muted">Categoria</label>
            <select
              value={form.categoria}
              onChange={(e) =>
                setForm((f) => ({ ...f, categoria: e.target.value }))
              }
              style={selectStyle}
              disabled={loadingCatalogs}
            >
              <option value="">—</option>
              {categorias.map((item) => (
                <option key={item.id} value={item.nome}>
                  {item.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="muted">Tipo de contrato</label>
            <select
              value={form.contrato_tipo}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  contrato_tipo: e.target.value,
                }))
              }
              style={selectStyle}
              disabled={loadingCatalogs}
            >
              <option value="">—</option>
              {contratos.map((item) => (
                <option key={item.id} value={item.nome}>
                  {item.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={sectionTitleStyle}>Contrato</div>

        <div style={grid2}>
          <div>
            <label className="muted">Tipo de remuneração</label>
            <select
              value={form.salario_tipo}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  salario_tipo: e.target.value as SalarioTipo,
                  custo_hora: '',
                  custo_dia: '',
                  salario_atual: '',
                }))
              }
              style={selectStyle}
            >
              <option value="hora">Hora</option>
              <option value="dia">Dia</option>
              <option value="mensal">Mensal</option>
            </select>
          </div>

          {form.salario_tipo === 'hora' && (
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
          )}

          {form.salario_tipo === 'dia' && (
            <div>
              <label className="muted">Custo dia (€)</label>
              <input
                type="number"
                step="0.01"
                value={form.custo_dia}
                onChange={(e) =>
                  setForm((f) => ({ ...f, custo_dia: e.target.value }))
                }
                style={inputStyle}
              />
            </div>
          )}

          {form.salario_tipo === 'mensal' && (
            <div>
              <label className="muted">Salário mensal (€)</label>
              <input
                type="number"
                step="0.01"
                value={form.salario_atual}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    salario_atual: e.target.value,
                  }))
                }
                style={inputStyle}
              />
            </div>
          )}
        </div>

        <div style={grid2}>
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

          <div>
            <label className="muted">Data de saída</label>
            <input
              type="date"
              value={form.data_saida}
              onChange={(e) =>
                setForm((f) => ({ ...f, data_saida: e.target.value }))
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

        <div style={sectionTitleStyle}>Acessos</div>

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

        <div style={sectionTitleStyle}>Observações</div>

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
