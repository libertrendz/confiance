// app/adm/colaboradores/[id]/edit/page.tsx
'use client';

import { useEffect, useState } from 'react';

type RecordColab = {
  id: string;
  nome: string | null;
  nif: string | null;
  email: string | null;
  telefone: string | null;
  tipo: string | null;
  custo_hora: number | null;
  categoria: string | null;
  contrato_tipo: string | null;
  iban: string | null;
  data_admissao: string | null;
  ativo: boolean | null;
  pode_aceder_sistema: boolean | null;
  pode_registar_ponto: boolean | null;
};

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
          setRecord(r);
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
      const payload = {
        id: record.id,
        nome: record.nome,
        nif: record.nif,
        email: record.email,
        telefone: record.telefone,
        tipo: record.tipo,
        custo_hora: record.custo_hora,
        categoria: record.categoria,
        contrato_tipo: record.contrato_tipo,
        iban: record.iban,
        data_admissao: record.data_admissao,
        ativo: record.ativo ?? true,
        pode_aceder_sistema: record.pode_aceder_sistema ?? false,
        pode_registar_ponto: record.pode_registar_ponto ?? false,
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
      window.location.replace('/adm/colaboradores');
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
        style={{ display: 'grid', gap: 12, maxWidth: 820 }}
      >
        {/* Nome */}
        <div>
          <label className="muted">Nome *</label>
          <input
            required
            value={record.nome || ''}
            onChange={e =>
              setRecord(r => (r ? { ...r, nome: e.target.value } : r))
            }
            style={{
              width: '100%',
              padding: 10,
              border: '1px solid var(--border)',
              borderRadius: 10,
            }}
          />
        </div>

        {/* NIF / Telefone */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="muted">NIF (9 dígitos)</label>
            <input
              value={record.nif || ''}
              onChange={e =>
                setRecord(r => (r ? { ...r, nif: e.target.value } : r))
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
          <div>
            <label className="muted">Telefone (9 dígitos)</label>
            <input
              value={record.telefone || ''}
              onChange={e =>
                setRecord(r => (r ? { ...r, telefone: e.target.value } : r))
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

        {/* Email / Tipo */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr', gap: 12 }}>
          <div>
            <label className="muted">Email</label>
            <input
              type="email"
              value={record.email || ''}
              onChange={e =>
                setRecord(r => (r ? { ...r, email: e.target.value } : r))
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
              value={record.tipo || ''}
              onChange={e =>
                setRecord(r => (r ? { ...r, tipo: e.target.value } : r))
              }
              style={{
                width: '100%',
                padding: 10,
                border: '1px solid var(--border)',
                borderRadius: 10,
                background: '#fff',
              }}
            >
              <option value="">—</option>
              <option value="empregado">Empregado</option>
              <option value="externo">Externo</option>
            </select>
          </div>
        </div>

        {/* Categoria / Tipo contrato */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="muted">Categoria</label>
            <input
              value={record.categoria || ''}
              onChange={e =>
                setRecord(r => (r ? { ...r, categoria: e.target.value } : r))
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
            <label className="muted">Tipo de contrato</label>
            <input
              value={record.contrato_tipo || ''}
              onChange={e =>
                setRecord(r =>
                  r ? { ...r, contrato_tipo: e.target.value } : r,
                )
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

        {/* IBAN */}
        <div>
          <label className="muted">IBAN</label>
          <input
            value={record.iban || ''}
            onChange={e =>
              setRecord(r => (r ? { ...r, iban: e.target.value } : r))
            }
            style={{
              width: '100%',
              padding: 10,
              border: '1px solid var(--border)',
              borderRadius: 10,
            }}
          />
        </div>

        {/* Custo hora / Data admissão */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="muted">Custo hora (€)</label>
            <input
              type="number"
              step="0.01"
              value={record.custo_hora ?? ''}
              onChange={e =>
                setRecord(r =>
                  r
                    ? {
                        ...r,
                        custo_hora:
                          e.target.value === '' ? null : Number(e.target.value),
                      }
                    : r,
                )
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
              value={record.data_admissao?.slice(0, 10) || ''}
              onChange={e =>
                setRecord(r =>
                  r ? { ...r, data_admissao: e.target.value } : r,
                )
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

        {/* Flags */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 12,
          }}
        >
          <label className="muted">
            <input
              type="checkbox"
              checked={!!record.ativo}
              onChange={e =>
                setRecord(r => (r ? { ...r, ativo: e.target.checked } : r))
              }
              style={{ marginRight: 6 }}
            />
            Ativo
          </label>

          <label className="muted">
            <input
              type="checkbox"
              checked={!!record.pode_aceder_sistema}
              onChange={e =>
                setRecord(r =>
                  r ? { ...r, pode_aceder_sistema: e.target.checked } : r,
                )
              }
              style={{ marginRight: 6 }}
            />
            Pode aceder ao sistema
          </label>

          <label className="muted">
            <input
              type="checkbox"
              checked={!!record.pode_registar_ponto}
              onChange={e =>
                setRecord(r =>
                  r ? { ...r, pode_registar_ponto: e.target.checked } : r,
                )
              }
              style={{ marginRight: 6 }}
            />
            Pode registar ponto
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
