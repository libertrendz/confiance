// app/menu/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

export const dynamic = 'force-dynamic';

type AppRole = 'admin' | 'gestor' | 'externo';

type RoteiroHoje = {
  tarefa_nome: string | null;
  local_nome: string | null;
  status: string | null;
} | null;

type UltimoPontoHoje = {
  tipo: string;
  created_at: string;
} | null;

export default function MenuPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);

  const [email, setEmail] = useState<string | null>(null);
  const [nome, setNome] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [ready, setReady] = useState(false);

  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  const [roteiroHoje, setRoteiroHoje] = useState<RoteiroHoje>(null);
  const [ultimoPontoHoje, setUltimoPontoHoje] = useState<UltimoPontoHoje>(null);
  const [loadingRoteiro, setLoadingRoteiro] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: ud } = await supa.auth.getUser();
        const user = ud.user;
        const uid = user?.id ?? null;

        setUsuarioId(uid);
        setEmail(user?.email ?? null);

        const meta = (user?.user_metadata || {}) as Record<string, any>;
        let effectiveRole: AppRole = (meta.app_role as AppRole) || 'externo';

        const metaNome =
          (meta.nome_exibicao as string) ||
          (meta.nome as string) ||
          (meta.name as string) ||
          null;

        if (uid) {
          const { data: prof } = await supa
            .from('profiles')
            .select('papel, nome_exibicao, nome, empresa_id')
            .eq('user_id', uid)
            .maybeSingle();

          const dbRole = prof?.papel as AppRole | undefined;
          if (dbRole && ['admin', 'gestor', 'externo'].includes(dbRole)) {
            effectiveRole = dbRole;
          }

          const dbNome = prof?.nome_exibicao || prof?.nome || null;
          setNome(metaNome || dbNome || null);

          setEmpresaId((prof as any)?.empresa_id ?? null);
        } else {
          setNome(metaNome || null);
          setEmpresaId(null);
        }

        if (effectiveRole === 'admin' || effectiveRole === 'gestor') {
          window.location.replace('/adm/dashboard');
          return;
        }

        setRole(effectiveRole);
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [supa]);

  function clearSupabaseStorage() {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) keys.push(k);
      }
      keys
        .filter((k) => k.startsWith('sb-') || k.includes('supabase'))
        .forEach((k) => localStorage.removeItem(k));
    } catch {}
    try {
      const keys: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k) keys.push(k);
      }
      keys
        .filter((k) => k.startsWith('sb-') || k.includes('supabase'))
        .forEach((k) => sessionStorage.removeItem(k));
    } catch {}
  }

  async function sair() {
    try {
      await supa.auth.signOut();
    } catch {}

    clearSupabaseStorage();

    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch {}
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {}

    window.location.replace('/login');
  }

  function todayStr() {
    const hoje = new Date();
    const yyyy = hoje.getFullYear();
    const mm = String(hoje.getMonth() + 1).padStart(2, '0');
    const dd = String(hoje.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  async function carregarRoteiroEStatusHoje() {
    if (!usuarioId || !empresaId) return;

    setLoadingRoteiro(true);
    try {
      const t = todayStr();

      // 1) Roteiro do dia
      const { data: r, error: rErr } = await supa
        .from('ponto_roteiros')
        .select(
          `
          status,
          tarefa_id,
          tarefas_padrao ( nome ),
          local_id,
          locais_permitidos ( nome ),
          data_dia,
          data_fim
        `
        )
        .eq('empresa_id', empresaId)
        .eq('usuario_id', usuarioId)
        .lte('data_dia', t)
        .or(`data_fim.is.null,data_fim.gte.${t}`)
        .in('status', ['planeado', 'ativo', 'em_andamento'])
        .order('data_dia', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (rErr) throw rErr;

      if (r?.tarefa_id) {
        setRoteiroHoje({
          tarefa_nome: (r as any).tarefas_padrao?.nome ?? null,
          local_nome: (r as any).locais_permitidos?.nome ?? null,
          status: (r as any).status ?? null,
        });
      } else {
        setRoteiroHoje(null);
      }

      // 2) Último ponto do dia (pra saber se o dia já foi finalizado)
      const { data: p, error: pErr } = await supa
        .from('ponto_registro')
        .select('tipo, created_at')
        .eq('empresa_id', empresaId)
        .eq('usuario_id', usuarioId)
        .gte('created_at', `${t}T00:00:00.000Z`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pErr) throw pErr;

      setUltimoPontoHoje(p ? ({ tipo: (p as any).tipo, created_at: (p as any).created_at } as any) : null);
    } catch (e) {
      console.error('Erro ao carregar roteiro/status do dia', e);
      setRoteiroHoje(null);
      setUltimoPontoHoje(null);
    } finally {
      setLoadingRoteiro(false);
    }
  }

  useEffect(() => {
    if (!usuarioId || !empresaId) return;
    carregarRoteiroEStatusHoje();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioId, empresaId]);

  if (!ready || role === null) {
    return (
      <main style={{ padding: 24, fontFamily: 'system-ui' }}>
        <p style={{ color: '#666' }}>A carregar…</p>
      </main>
    );
  }

  const diaFinalizado = ultimoPontoHoje?.tipo === 'saida';

  return (
    <main
      style={{
        padding: 16,
        fontFamily: 'system-ui',
        maxWidth: 1100,
        margin: '0 auto',
      }}
    >
      {/* Header: Logo + CONFIANCE + Área do colaborador (NÃO MEXER) */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 10,
        }}
      >
        <img
          src="https://cfremxfgqehqnbqummti.supabase.co/storage/v1/object/public/images/app-novo.png"
          alt="CONFIANCE"
          style={{ height: 28, width: 'auto', display: 'block' }}
        />

        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              color: '#6b7280',
              lineHeight: 1.1,
            }}
          >
            CONFIANCE
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 900,
              color: '#0e3258',
              lineHeight: 1.1,
            }}
          >
            Área do colaborador
          </div>
        </div>
      </header>

      {/* Cabeçalho: role + nome + sair (NÃO MEXER) */}
      <header
        className="topbar"
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          alignItems: 'center',
          gap: 10,
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            background: '#EEF3FF',
            color: '#0e3258',
            padding: '6px 10px',
            borderRadius: 999,
            border: '1px solid #D7E3FF',
            whiteSpace: 'nowrap',
          }}
        >
          {role.toUpperCase()}
        </span>

        <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              color: '#0e3258',
              fontWeight: 800,
              fontSize: 18,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
            }}
            title={(nome || email) ?? undefined}
          >
            {nome || email || '—'}
          </span>
        </div>

        <div>
          <button
            onClick={sair}
            className="btn btn-ghost"
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            Sair
          </button>
        </div>
      </header>

      {/* Conteúdo: 3 blocos (Registo de Hoje / Histórico / Meus Recibos) */}
      <section
        className="grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 12,
          marginTop: 16,
        }}
      >
        {/* 1) Registo de Hoje (card principal) */}
        <article
          className="card"
          style={{
            border: '1px solid #E9EEF7',
            borderRadius: 18,
            padding: 20,
            background: '#fff',
            boxShadow: '0 1px 0 rgba(14,50,88,0.06)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 180,
            gridColumn: '1 / -1',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0 }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 900,
                  color: '#0e3258',
                }}
              >
                Registo de Hoje
              </h3>

              <p style={{ margin: '8px 0 0 0', color: '#49546A', fontSize: 13 }}>
                Acompanhe a(s) atividade(s) atribuída(s) e faça a marcação de ponto.
              </p>

              {loadingRoteiro ? (
                <p style={{ margin: '10px 0 0 0', color: '#49546A', fontSize: 13 }}>A carregar…</p>
              ) : roteiroHoje ? (
                <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                      Tarefa
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#0e3258' }}>
                      {roteiroHoje.tarefa_nome || '—'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                      Local
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#0e3258' }}>
                      {roteiroHoje.local_nome || '—'}
                    </div>
                  </div>
                </div>
              ) : (
                <p style={{ margin: '10px 0 0 0', color: '#49546A', fontSize: 13 }}>
                  Ainda não existe roteiro atribuído para hoje.
                </p>
              )}
            </div>

            {!loadingRoteiro && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  fontWeight: 800,
                  padding: '6px 10px',
                  borderRadius: 999,
                  border: '1px solid #D7E3FF',
                  background: diaFinalizado ? '#EEF3FF' : '#FFF7D6',
                  color: '#0e3258',
                  whiteSpace: 'nowrap',
                }}
                title={diaFinalizado ? 'Atividade finalizada' : 'Atividade em aberto'}
              >
                {diaFinalizado ? '✓ Atividade finalizada' : '⏳ Atividade em aberto'}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14, flexWrap: 'wrap' }}>
            <a
              href="/ponto"
              style={{
                textDecoration: 'none',
                fontSize: 13,
                padding: '10px 14px',
                borderRadius: 12,
                border: 'none',
                background: '#0e3258',
                color: '#fff',
                fontWeight: 700,
              }}
            >
              Verificar agora
            </a>

///            <a
///              href="/ponto/historico"
///              style={{
///               textDecoration: 'none',
///                fontSize: 13,
///                padding: '10px 14px',
///                borderRadius: 12,
///                border: '1px solid #D7E3FF',
///                background: '#FFD24D',
///                color: '#0e3258',
///                fontWeight: 800,
///              }}
///            >
///              Ver histórico
///            </a>
///          </div>
        </article>

        {/* 2) Histórico de Registos (1 botão só) */}
        <Card
          title="Histórico de Registos"
          desc="Consulte aqui os seus registos de ponto."
          actions={[{ href: '/ponto/historico', label: 'Abrir histórico', kind: 'accent' }]}
        />

        {/* 3) Meus Recibos */}
        <Card
          title="Meus Recibos"
          desc="Consulte aqui seus Recibos de Vencimento."
          actions={[{ href: '#', label: 'Em breve', kind: 'ghost', disabled: true }]}
        />
      </section>
    </main>
  );
}

type CardAction = { href: string; label: string; kind?: 'primary' | 'accent' | 'ghost'; disabled?: boolean };

function Card({
  title,
  desc,
  actions = [],
}: {
  title: string;
  desc: string;
  actions?: CardAction[];
}) {
  return (
    <article
      className="card"
      style={{
        border: '1px solid #E9EEF7',
        borderRadius: 18,
        padding: 18,
        background: '#fff',
        boxShadow: '0 1px 0 rgba(14,50,88,0.06)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: 150,
      }}
    >
      <div>
        <h3
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 900,
            color: '#0e3258',
          }}
        >
          {title}
        </h3>
        <p style={{ margin: '8px 0 0 0', color: '#49546A', fontSize: 13 }}>{desc}</p>
      </div>

      {!!actions.length && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
          {actions.map((a) => {
            const isDisabled = a.disabled === true;
            const bg = a.kind === 'primary' ? '#0e3258' : a.kind === 'accent' ? '#FFD24D' : '#fff';
            const border = a.kind === 'primary' ? 'none' : '1px solid #D7E3FF';
            const color = a.kind === 'primary' ? '#fff' : '#0e3258';

            return (
              <a
                key={a.href + a.label}
                href={isDisabled ? undefined : a.href}
                aria-disabled={isDisabled}
                onClick={(e) => {
                  if (isDisabled) e.preventDefault();
                }}
                style={{
                  textDecoration: 'none',
                  fontSize: 13,
                  padding: '10px 12px',
                  borderRadius: 12,
                  border,
                  background: bg,
                  color,
                  fontWeight: 800,
                  opacity: isDisabled ? 0.55 : 1,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                }}
              >
                {a.label}
              </a>
            );
          })}
        </div>
      )}
    </article>
  );
}
