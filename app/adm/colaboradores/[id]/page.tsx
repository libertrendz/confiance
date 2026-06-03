/**
 * ============================================================
 * CONFIANCE ERP
 * Arquivo: app/adm/colaboradores/[id]/page.tsx
 * Módulo: Colaboradores
 * Página: Workspace do Colaborador
 * Rota: /adm/colaboradores/[id]
 *
 * Objetivo:
 * Centralizar a visualização do colaborador e servir de
 * base para os módulos de RH:
 * - Dados Gerais
 * - Contrato
 * - Férias
 * - Ausências
 * - Histórico Profissional
 *
 * Autor: Libertrendz
 * ============================================================
 */

'use client';

import { useEffect, useState } from 'react';

type TabKey =
  | 'dados'
  | 'contrato'
  | 'ferias'
  | 'ausencias'
  | 'historico';

type RecordColab = {
  id: string;

  empresa_id?: string | null;
  user_id?: string | null;

  codigo?: string | null;

  nome?: string | null;
  nif?: string | null;
  email?: string | null;
  telefone?: string | null;
  morada?: string | null;

  data_nasc?: string | null;

  funcao?: string | null;
  categoria?: string | null;

  tipo?: string | null;
  contrato_tipo?: string | null;

  salario_tipo?: string | null;
  salario_atual?: number | null;
  custo_hora?: number | null;

  iban?: string | null;

  data_admissao?: string | null;
  data_saida?: string | null;
  data_demissao?: string | null;

  notas?: string | null;

  ativo?: boolean | null;

  pode_aceder_sistema?: boolean | null;
  pode_registar_ponto?: boolean | null;

  exige_geo?: boolean | null;
  exige_foto?: boolean | null;
};

function fmtDate(v?: string | null) {
  if (!v) return '—';

  try {
    return new Date(v).toLocaleDateString('pt-PT');
  } catch {
    return v;
  }
}

function CardInfo({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div
      className="card"
      style={{
        padding: 12,
        minHeight: 78,
      }}
    >
      <div
        className="muted"
        style={{
          fontSize: 12,
          marginBottom: 6,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontWeight: 600,
          wordBreak: 'break-word',
        }}
      >
        {value || '—'}
      </div>
    </div>
  );
}

export default function ColaboradorWorkspacePage({
  params,
}: {
  params: { id: string };
}) {
  const [record, setRecord] = useState<RecordColab | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<TabKey>('dados');

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await fetch(
          `/api/admin/colaboradores/get?id=${encodeURIComponent(params.id)}`,
          { cache: 'no-store' },
        );

        const ct = res.headers.get('content-type') || '';

        if (!ct.includes('application/json')) {
          throw new Error(`Resposta inválida do servidor (${res.status})`);
        }

        const j = await res.json();

        if (!j.ok) {
          throw new Error(j.error || 'Erro ao carregar colaborador');
        }

        if (alive) {
          setRecord(j.record);
        }
      } catch (e: any) {
        if (alive) {
          setError(e?.message || 'Erro ao carregar colaborador');
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [params.id]);

  if (loading) {
    return <main style={{ padding: 18 }}>A carregar…</main>;
  }

  if (!record) {
    return (
      <main
        style={{
          padding: 18,
          color: 'crimson',
        }}
      >
        {error || 'Colaborador não encontrado'}
      </main>
    );
  }

  return (
    <main style={{ padding: 18 }}>
      {/* CABEÇALHO */}

      <section
        className="card"
        style={{
          padding: 18,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div
              className="muted"
              style={{
                marginBottom: 4,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              Colaborador
            </div>

            <h1
              className="h1"
              style={{
                margin: 0,
                marginBottom: 8,
              }}
            >
              {record.nome || 'Sem nome'}
            </h1>

            <div className="muted">
              {record.funcao || 'Sem função definida'}
            </div>

            <div
              className="muted"
              style={{ marginTop: 8 }}
            >
              Categoria: {record.categoria || '—'}
            </div>

            <div className="muted">
              Contrato: {record.contrato_tipo || '—'}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontWeight: 700,
                marginBottom: 12,
                color: record.ativo ? 'green' : 'crimson',
              }}
            >
              {record.ativo ? 'ATIVO' : 'INATIVO'}
            </div>

            <div
              style={{
                display: 'flex',
                gap: 8,
              }}
            >
              <a
                href={`/adm/colaboradores/${record.id}/edit`}
                className="btn btn-primary"
              >
                Editar
              </a>

              <a
                href="/adm/colaboradores"
                className="btn btn-ghost"
              >
                Voltar
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* TABS */}

      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 18,
        }}
      >
        <button
          className={tab === 'dados' ? 'btn btn-primary' : 'btn btn-ghost'}
          onClick={() => setTab('dados')}
        >
          Dados Gerais
        </button>

        <button
          className={tab === 'contrato' ? 'btn btn-primary' : 'btn btn-ghost'}
          onClick={() => setTab('contrato')}
        >
          Contrato
        </button>

        <button
          className={tab === 'ferias' ? 'btn btn-primary' : 'btn btn-ghost'}
          onClick={() => setTab('ferias')}
        >
          Férias
        </button>

        <button
          className={tab === 'ausencias' ? 'btn btn-primary' : 'btn btn-ghost'}
          onClick={() => setTab('ausencias')}
        >
          Ausências
        </button>

        <button
          className={tab === 'historico' ? 'btn btn-primary' : 'btn btn-ghost'}
          onClick={() => setTab('historico')}
        >
          Histórico
        </button>
      </div>

      {/* DADOS GERAIS */}

      {tab === 'dados' && (
        <section
          style={{
            display: 'grid',
            gap: 12,
            gridTemplateColumns:
              'repeat(auto-fit, minmax(220px, 1fr))',
          }}
        >
          <CardInfo label="Nome" value={record.nome} />
          <CardInfo label="Código" value={record.codigo} />
          <CardInfo label="NIF" value={record.nif} />
          <CardInfo label="Email" value={record.email} />
          <CardInfo label="Telefone" value={record.telefone} />
          <CardInfo label="Morada" value={record.morada} />
          <CardInfo
            label="Data de Nascimento"
            value={fmtDate(record.data_nasc)}
          />
          <CardInfo label="Tipo" value={record.tipo} />
        </section>
      )}

      {/* CONTRATO */}

      {tab === 'contrato' && (
        <>
          <section
            style={{
              display: 'grid',
              gap: 12,
              gridTemplateColumns:
                'repeat(auto-fit, minmax(220px, 1fr))',
            }}
          >
            <CardInfo label="Função" value={record.funcao} />

            <CardInfo
              label="Categoria"
              value={record.categoria}
            />

            <CardInfo
              label="Tipo de Contrato"
              value={record.contrato_tipo}
            />

            <CardInfo
              label="Salário Atual"
              value={
                record.salario_atual != null
                  ? `${record.salario_atual} €`
                  : '—'
              }
            />

            <CardInfo
              label="Tipo de Salário"
              value={record.salario_tipo}
            />

            <CardInfo
              label="Custo Hora"
              value={
                record.custo_hora != null
                  ? `${record.custo_hora} €`
                  : '—'
              }
            />

            <CardInfo label="IBAN" value={record.iban} />

            <CardInfo
              label="Data Admissão"
              value={fmtDate(record.data_admissao)}
            />

            <CardInfo
              label="Data Saída"
              value={fmtDate(record.data_saida)}
            />

            <CardInfo
              label="Data Demissão"
              value={fmtDate(record.data_demissao)}
            />
          </section>

          <section
            style={{
              marginTop: 18,
              display: 'grid',
              gap: 12,
              gridTemplateColumns:
                'repeat(auto-fit, minmax(220px, 1fr))',
            }}
          >
            <CardInfo
              label="Pode aceder ao sistema"
              value={
                record.pode_aceder_sistema ? 'Sim' : 'Não'
              }
            />

            <CardInfo
              label="Pode registar ponto"
              value={
                record.pode_registar_ponto ? 'Sim' : 'Não'
              }
            />

            <CardInfo
              label="Exige Geolocalização"
              value={record.exige_geo ? 'Sim' : 'Não'}
            />

            <CardInfo
              label="Exige Fotografia"
              value={record.exige_foto ? 'Sim' : 'Não'}
            />
          </section>

          {!!record.notas && (
            <section
              className="card"
              style={{
                padding: 16,
                marginTop: 18,
              }}
            >
              <div
                className="muted"
                style={{ marginBottom: 8 }}
              >
                Observações
              </div>

              <div>{record.notas}</div>
            </section>
          )}
        </>
      )}

      {/* FÉRIAS */}

      {tab === 'ferias' && (
        <section className="card" style={{ padding: 18 }}>
          <h3>Férias</h3>
          <p className="muted">
            Módulo em preparação.
          </p>
        </section>
      )}

      {/* AUSÊNCIAS */}

      {tab === 'ausencias' && (
        <section className="card" style={{ padding: 18 }}>
          <h3>Ausências</h3>
          <p className="muted">
            Módulo em preparação.
          </p>
        </section>
      )}

      {/* HISTÓRICO */}

      {tab === 'historico' && (
        <section className="card" style={{ padding: 18 }}>
          <h3>Histórico Profissional</h3>
          <p className="muted">
            Módulo em preparação.
          </p>
        </section>
      )}
    </main>
  );
}
