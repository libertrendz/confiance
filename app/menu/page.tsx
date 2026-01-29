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

type JornadaHoje = {
  hasEntrada: boolean;
  almocoOut: boolean;
  almocoIn: boolean;
  hasSaida: boolean;
};

function todayLocalStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function localDateStrFromIso(iso: string) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

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
  const [jornadaHoje, setJornadaHoje] = useState<JornadaHoje>({
    hasEntrada: false,
    almocoOut: false,
    almocoIn: false,
    hasSaida: false,
  });

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

  async function carregarRoteiroEStatusHoje() {
    if (!usuarioId || !empresaId) return;

    setLoadingRoteiro(true);
    try {
      const t = todayLocalStr();

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
        .in('status', ['planeado', 'em_andamento', 'ativo'])
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

      // 2) Pontos do “dia local”
      const { data: pontos, error: pErr } = await supa
        .from('ponto_registro')
        .select('tipo, created_at')
        .eq('empresa_id', empresaId)
        .eq('usuario_id', usuarioId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (pErr) throw pErr;

      const pontosHoje = (pontos || []).filter((p: any) => localDateStrFromIso(p.created_at) === t);

      const hasEntrada = pontosHoje.some((p: any) => p.tipo === 'entrada');
      const almocoOut = pontosHoje.some((p: any) => p.tipo === 'saida_almoco');
      const almocoIn = pontosHoje.some((p: any) => p.tipo === 'retorno_almoco');
      const hasSaida = pontosHoje.some((p: any) => p.tipo === 'saida');

      // último ponto hoje (apenas para auditoria/visão rápida)
      const ultimo = pontosHoje[0] || null;
      setUltimoPontoHoje(ultimo ? ({ tipo: ultimo.tipo, created_at: ultimo.created_at } as any) : null);

      // jornada do dia (almoço é do dia, não da tarefa)
      setJornadaHoje({ hasEntrada, almocoOut, almocoIn, hasSaida });
    } catch (e) {
      console.error('Erro ao carregar roteiro/status do dia', e);
      setRoteiroHoje(null);
      setUltimoPontoHoje(null);
      setJornadaHoje({ hasEntrada: false, almocoOut: false, almocoIn: false, hasSaida: false });
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

  const diaFinalizado = jornadaHoje.hasSaida;

  // ✅ almoço do dia (depende de existir pelo menos 1 check-in hoje)
  const almocoCompleto = jornadaHoje.almocoOut && jornadaHoje.almocoIn;
  const emAlmoco = jornadaHoje.almocoOut && !jornadaHoje.almocoIn;
  const almocoPendente = jornadaHoje.hasEntrada && !almocoCompleto && !emAlmoco;

  // ✅ regra final: se não há roteiro hoje, NÃO pode aparecer “em aberto”
  const statusPill = !roteiroHoje
    ? { label: 'Sem atividade hoje', bg: '#EEF3FF' }
    : diaFinalizado
      ? { label: 'Atividade executada', bg: '#EEF3FF' }
      : emAlmoco
        ? { label: 'Em almoço', bg: '#FFF7D6' }
        : almocoPendente
          ? { label: 'Almoço pendente', bg: '#FFF7D6' }
          : { label: 'Atividade em aberto', bg: '#FFF7D6' };

  return (
    <main
      style={{
        padding: 16,
        fontFamily: 'system-ui',
        maxWidth: 1100,
        margin: '0 auto',
      }}
    >
      {/* Header: Logo + CONFIANCE + Área do colaborador */}
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

      {/* Cabeçalho: role + nome + sair */}
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

      {/* Cards */}
      <section
        className="grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 12,
          marginTop: 16,
        }}
      >
        {/* 1) Registo de Hoje */}
        <Card
          title="Registo de Hoje"
          desc="Acompanhe o seu registo de hoje e verifique a sua atividade atual."
          meta={
            roteiroHoje
              ? [
                  { label: 'Tarefa', value: roteiroHoje.tarefa_nome || '—' },
                  { label: 'Local', value: roteiroHoje.local_nome || '—' },
                  {
                    label: 'Almoço',
                    value: !jornadaHoje.hasEntrada
                      ? 'Faça check-in para liberar o almoço'
                      : emAlmoco
                        ? 'Em curso'
                        : almocoCompleto
                          ? 'Concluído'
                          : 'Pendente',
                  },
                ]
              : [
                  {
                    label: 'Almoço',
                    value: !jornadaHoje.hasEntrada
                      ? 'Sem check-in hoje'
                      : emAlmoco
                        ? 'Em curso'
                        : almocoCompleto
                          ? 'Concluído'
                          : 'Pendente',
                  },
                ]
          }
          pill={{
            label: loadingRoteiro ? 'A carregar…' : statusPill.label,
            bg: statusPill.bg,
            hidden: false,
          }}
          actions={[{ href: '/ponto', label: 'Verificar agora', kind: 'primary' }]}
          loading={loadingRoteiro}
        />

        {/* 2) Histórico de Registos */}
        <Card
          title="Histórico de Registos"
          desc="Consulte aqui o seu histórico de registos de ponto."
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

type CardAction = {
  href: string;
  label: string;
  kind?: 'primary' | 'accent' | 'ghost';
  disabled?: boolean;
};

function Card({
  title,
  desc,
  actions = [],
  meta = [],
  pill,
  loading,
}: {
  title: string;
  desc: string;
  actions?: CardAction[];
  meta?: Array<{ label: string; value: string }>;
  pill?: { label: string; bg: string; hidden?: boolean };
  loading?: boolean;
}) {
  return (
    <article
      className="card"
      style={{
        border: '1px solid #E9EEF7',
        borderRadius: 16,
        padding: 16,
        background: '#fff',
        boxShadow: '0 1px 0 rgba(14,50,88,0.06)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: 160,
      }}
    >
      <div>
        <h3
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 800,
            color: '#0e3258',
          }}
        >
          {title}
        </h3>

        <p style={{ margin: '8px 0 0 0', color: '#49546A', fontSize: 13 }}>{desc}</p>

        {!!meta.length && (
          <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
            {meta.map((m) => (
              <p key={m.label} style={{ margin: 0, color: '#49546A', fontSize: 13 }}>
                <strong>{m.label}:</strong> {m.value}
              </p>
            ))}
          </div>
        )}

        {pill && pill.hidden !== true && (
          <div style={{ marginTop: 10 }}>
            <span
              style={{
                display: 'inline-block',
                fontSize: 12,
                fontWeight: 800,
                padding: '6px 10px',
                borderRadius: 999,
                border: '1px solid #D7E3FF',
                background: pill.bg,
                color: '#0e3258',
                opacity: loading ? 0.8 : 1,
              }}
            >
              {pill.label}
            </span>
          </div>
        )}
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
                  padding: '8px 12px',
                  borderRadius: 10,
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
