/**

============================================================
CONFIANCE ERP
Arquivo: app/adm/colaboradores/[id]/edit/page.tsx
Módulo: Colaboradores
Página: Editar Colaborador
Rota: /adm/colaboradores/[id]/edit
Objetivo:
Editar a ficha cadastral, contratual e operacional do colaborador.
Autor: Libertrendz
============================================================
*/

'use client';

import { useEffect, useState } from 'react';

type PerfilAcesso = '' | 'externo_ponto' | 'interno_total';

type RecordColab = {
id: string;
nome: string | null;
nif: string | null;
email: string | null;
telefone: string | null;
morada: string | null;
data_nasc: string | null;
tipo: string | null;
funcao: string | null;
custo_hora: number | null;
categoria: string | null;
contrato_tipo: string | null;
iban: string | null;
data_admissao: string | null;
notas: string | null;
ativo: boolean | null;
pode_aceder_sistema: boolean | null;
pode_registar_ponto: boolean | null;
perfil_acesso?: PerfilAcesso | null;
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

function inferPerfilFromFlags(
pode_aceder_sistema: boolean | null,
pode_registar_ponto: boolean | null,
): PerfilAcesso {
const sys = !!pode_aceder_sistema;
const ponto = !!pode_registar_ponto;
if (sys && ponto) return 'interno_total';
if (!sys && ponto) return 'externo_ponto';
return '';
}

export default function ColaboradorEditPage({ params }: { params: { id: string } }) {
const id = params?.id;
const [record, setRecord] = useState<RecordColab | null>(null);
const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);
const [err, setErr] = useState<string | null>(null);

useEffect(() => {
let alive = true;

(async () => {
  try {
    if (!id) throw new Error('ID em falta');

    const res = await fetch(
      `/api/admin/colaboradores/get?id=${encodeURIComponent(id)}`,
      { cache: 'no-store' },
    );

    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      throw new Error(`Resposta inválida do servidor (${res.status})`);
    }

    const j = await res.json();
    if (!j.ok) throw new Error(j.error || 'Falha ao carregar colaborador');

    if (alive) {
      const r = j.record as RecordColab;
      const perfil = inferPerfilFromFlags(
        r.pode_aceder_sistema,
        r.pode_registar_ponto,
      );

      setRecord({ ...r, perfil_acesso: perfil });
    }
  } catch (e: any) {
    setErr(e?.message || 'Falha ao carregar colaborador');
  } finally {
    if (alive) setLoading(false);
  }
})();

return () => {
  alive = false;
};

}, [id]);

async function save(e: React.FormEvent) {
e.preventDefault();
if (!record) return;

setSaving(true);
setErr(null);

try {
  const flags = mapPerfilToFlags(record.perfil_acesso || '');

  const payload = {
    id: record.id,

    nome: record.nome,
    nif: record.nif,
    email: record.email,
    telefone: record.telefone,
    morada: record.morada,
    data_nasc: record.data_nasc,

    tipo: record.tipo,
    funcao: record.funcao,
    categoria: record.categoria,
    contrato_tipo: record.contrato_tipo,

    custo_hora: record.custo_hora,
    iban: record.iban,
    data_admissao: record.data_admissao,

    notas: record.notas,

    ativo: record.ativo ?? true,

    ...flags,
  };

  const res = await fetch('/api/admin/colaboradores/update', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    throw new Error(`Resposta inválida do servidor (${res.status})`);
  }

  const j = await res.json();
  if (!j.ok) throw new Error(j.error || 'Falha ao guardar colaborador');

  alert('Colaborador guardado.');
  window.location.replace(`/adm/colaboradores/${record.id}`);
} catch (e: any) {
  setErr(e?.message || 'Falha ao guardar colaborador');
} finally {
  setSaving(false);
}

}

if (loading) {
return <main style={{ padding: 18 }}>A carregar…</main>;
}

if (!record) {
return (
<main style={{ padding: 18, color: 'crimson' }}>
{err || 'Falha ao carregar colaborador'}
</main>
);
}

return (
<main style={{ padding: 18 }}>
<h1 className="h1" style={{ marginBottom: 12 }}>
Editar colaborador
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
        value={record.nome || ''}
        onChange={(e) =>
          setRecord((r) => (r ? { ...r, nome: e.target.value } : r))
        }
        style={inputStyle}
      />
    </div>

    <div style={grid2}>
      <div>
        <label className="muted">NIF (9 dígitos)</label>
        <input
          value={record.nif || ''}
          onChange={(e) =>
            setRecord((r) => (r ? { ...r, nif: e.target.value } : r))
          }
          maxLength={9}
          style={inputStyle}
        />
      </div>

      <div>
        <label className="muted">Telefone (9 dígitos)</label>
        <input
          value={record.telefone || ''}
          onChange={(e) =>
            setRecord((r) => (r ? { ...r, telefone: e.target.value } : r))
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
          value={record.email || ''}
          onChange={(e) =>
            setRecord((r) => (r ? { ...r, email: e.target.value } : r))
          }
          style={inputStyle}
        />
      </div>

      <div>
        <label className="muted">Data de nascimento</label>
        <input
          type="date"
          value={record.data_nasc?.slice(0, 10) || ''}
          onChange={(e) =>
            setRecord((r) =>
              r ? { ...r, data_nasc: e.target.value || null } : r,
            )
          }
          style={inputStyle}
        />
      </div>
    </div>

    <div>
      <label className="muted">Morada</label>
      <input
        value={record.morada || ''}
        onChange={(e) =>
          setRecord((r) => (r ? { ...r, morada: e.target.value } : r))
        }
        style={inputStyle}
      />
    </div>

    <div style={grid2}>
      <div>
        <label className="muted">Tipo</label>
        <select
          value={record.tipo || ''}
          onChange={(e) =>
            setRecord((r) => (r ? { ...r, tipo: e.target.value } : r))
          }
          style={selectStyle}
        >
          <option value="">—</option>
          <option value="empregado">Empregado</option>
          <option value="externo">Externo</option>
        </select>
      </div>

      <div>
        <label className="muted">Função</label>
        <input
          value={record.funcao || ''}
          onChange={(e) =>
            setRecord((r) => (r ? { ...r, funcao: e.target.value } : r))
          }
          style={inputStyle}
        />
      </div>
    </div>

    <div style={grid2}>
      <div>
        <label className="muted">Categoria</label>
        <input
          value={record.categoria || ''}
          onChange={(e) =>
            setRecord((r) =>
              r ? { ...r, categoria: e.target.value } : r,
            )
          }
          style={inputStyle}
        />
      </div>

      <div>
        <label className="muted">Tipo de contrato</label>
        <input
          value={record.contrato_tipo || ''}
          onChange={(e) =>
            setRecord((r) =>
              r ? { ...r, contrato_tipo: e.target.value } : r,
            )
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
          value={record.custo_hora ?? ''}
          onChange={(e) =>
            setRecord((r) =>
              r
                ? {
                    ...r,
                    custo_hora:
                      e.target.value === '' ? null : Number(e.target.value),
                  }
                : r,
            )
          }
          style={inputStyle}
        />
      </div>

      <div>
        <label className="muted">Data de admissão</label>
        <input
          type="date"
          value={record.data_admissao?.slice(0, 10) || ''}
          onChange={(e) =>
            setRecord((r) =>
              r ? { ...r, data_admissao: e.target.value || null } : r,
            )
          }
          style={inputStyle}
        />
      </div>
    </div>

    <div>
      <label className="muted">IBAN</label>
      <input
        value={record.iban || ''}
        onChange={(e) =>
          setRecord((r) => (r ? { ...r, iban: e.target.value } : r))
        }
        style={inputStyle}
      />
    </div>

    <div>
      <label className="muted">Perfil de acesso</label>
      <select
        value={record.perfil_acesso || ''}
        onChange={(e) =>
          setRecord((r) =>
            r ? { ...r, perfil_acesso: e.target.value as PerfilAcesso } : r,
          )
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
        value={record.notas || ''}
        onChange={(e) =>
          setRecord((r) => (r ? { ...r, notas: e.target.value } : r))
        }
        rows={4}
        style={{ ...inputStyle, resize: 'vertical' }}
      />
    </div>

    <div>
      <label className="muted">
        <input
          type="checkbox"
          checked={!!record.ativo}
          onChange={(e) =>
            setRecord((r) =>
              r ? { ...r, ativo: e.target.checked } : r,
            )
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

      <a href={`/adm/colaboradores/${record.id}`} className="btn btn-ghost">
        Cancelar
      </a>
    </div>
  </form>
</main>

);
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
