'use client';

const AZUL = '#0e3258';

type Card = {
  title: string;
  desc: string;
  href?: string;
  status?: 'ativo' | 'embreve';
};

const cards: Card[] = [
  {
    title: 'Utilizadores',
    desc: 'Gestão de utilizadores e perfis do app. Depois integra com Colaboradores.',
    href: '/adm/utilizadores',
    status: 'ativo',
  },
  {
    title: 'Roteiros e Tarefas',
    desc: 'Criação e gestão de roteiros, tarefas e locais de trabalho (mobilidade).',
    href: '/adm/roteiros',
    status: 'ativo',
  },
  {
    title: 'Registos de Ponto',
    desc: 'Consulta e auditoria de pontos registados. No futuro pode fundir com Roteiros.',
    href: '/adm/ponto',
    status: 'ativo',
  },
  {
    title: 'Fornecedores',
    desc: 'Gestão de fornecedores da Confiance, por empresa.',
    href: '/adm/fornecedores',
    status: 'ativo',
  },
  {
    title: 'Colaboradores',
    desc: 'Cadastro completo: dados de pagamento, contrato e integração com utilizadores.',
    status: 'embreve',
  },
  {
    title: 'Clientes',
    desc: 'Cadastro de clientes e prospects. Integra com Orçamentos/Contratos.',
    status: 'embreve',
  },
  {
    title: 'Orçamentos e Contratos',
    desc: 'Emissão e gestão de orçamentos. Aprovados viram contratos/obras.',
    status: 'embreve',
  },
  {
    title: 'Financeiro',
    desc: 'Contas a pagar/receber e evolução financeira por contrato/obra.',
    status: 'embreve',
  },
  {
    title: 'Gestão de Ativos',
    desc: 'Controlo de viaturas/ferramentas, alocação de recursos e inventário.',
    status: 'embreve',
  },
  {
    title: 'Configurações',
    desc: 'Idioma, esquema de cores e opções “core” do sistema.',
    status: 'embreve',
  },
];

export default function DashboardAdm() {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: AZUL }}>Dashboard</h1>
        <p style={{ margin: 0, color: '#64728a', fontSize: 13 }}>
          Bem-vindo. Use os atalhos abaixo para navegar pelos módulos.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {cards.map((c) => (
          <DashCard key={c.title} c={c} />
        ))}
      </div>
    </div>
  );
}

function DashCard({ c }: { c: Card }) {
  const disabled = c.status === 'embreve' || !c.href;

  return (
    <a
      href={disabled ? undefined : c.href}
      aria-disabled={disabled}
      onClick={(e) => {
        if (disabled) e.preventDefault();
      }}
      style={{
        textDecoration: 'none',
        background: '#fff',
        border: '1px solid #E9EEF7',
        borderRadius: 16,
        padding: 16,
        display: 'grid',
        gap: 10,
        boxShadow: '0 1px 0 rgba(14,50,88,0.06)',
        opacity: disabled ? 0.75 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ color: AZUL, fontSize: 16, fontWeight: 900, lineHeight: 1.15 }}>{c.title}</div>

        {c.status === 'embreve' ? (
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              padding: '6px 10px',
              borderRadius: 999,
              border: '1px solid #D7E3FF',
              background: 'rgba(255,210,77,0.25)',
              color: AZUL,
              whiteSpace: 'nowrap',
            }}
          >
            Em breve
          </span>
        ) : (
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              padding: '6px 10px',
              borderRadius: 999,
              border: '1px solid #D7E3FF',
              background: '#EEF3FF',
              color: AZUL,
              whiteSpace: 'nowrap',
            }}
          >
            Abrir
          </span>
        )}
      </div>

      <div style={{ color: '#49546A', fontSize: 13, lineHeight: 1.35 }}>{c.desc}</div>

      {!disabled ? (
        <div style={{ marginTop: 2, fontSize: 12, fontWeight: 800, color: AZUL }}>
          Ir para {c.title} →
        </div>
      ) : (
        <div style={{ marginTop: 2, fontSize: 12, fontWeight: 700, color: '#64728a' }}>
          Disponível em breve
        </div>
      )}
    </a>
  );
}
