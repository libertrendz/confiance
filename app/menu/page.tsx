// app/menu/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

export const dynamic = 'force-dynamic';

type AppRole = 'admin' | 'gestor' | 'externo';

type TipoPonto = 'entrada' | 'saida_almoco' | 'retorno_almoco' | 'saida' | 'in' | 'out';

type PontoRow = {
  id: string;
  empresa_id: string;
  usuario_id: string;
  tipo: string;
  created_at: string;
  batida_at: string | null;
};

export default function MenuPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [email, setEmail] = useState<string | null>(null);
  const [nome, setNome] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [ready, setReady] = useState(false);

  // novo: ids para buscar “roteiro de hoje” e estado do dia
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  const [loadingResumo, setLoadingResumo] = useState(false);
  const [errResumo, setErrResumo] = useState<string | null>(null);

  const [roteiroHoje, setRoteiroHoje] = useState<{
    tarefa_id: string;
    tarefa_nome: string;
    local_id: string | null;
    local_nome: string | null;
  } | null>(null);

  const [diaFinalizado, setDiaFinalizado] = useState(false);
  const [ultimoTipoHoje, setUltimoTipoHoje] = useState<string | null>(null);
  const [ultimaHora, setUltimaHora] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: ud } = await supa.auth.getUser();
        const user = ud.user;
        const uid = user?.id ?? null;

        setEmail(user?.email ?? null);
        setUsuarioId(uid);

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

          const eid = (prof as any)?.empresa_id ?? null;
          setEmpresaId(eid);
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

  // === NOVO: carregar resumo do dia (roteiro + último ponto de hoje) ===
  useEffect(() => {
    if (!ready || role !== 'externo') return;
    if (!usuarioId || !empresaId) return;

    let alive = true;

    (async () => {
      setLoadingResumo(true);
      setErrResumo(null);

      try {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

        // janela do dia p/ created_at
        const start = new Date(`${todayStr}T00:00:00.000Z`).toISOString();
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const yyyy2 = tomorrow.getUTCFullYear();
        const mm2 = String(tomorrow.getUTCMonth() + 1).padStart(2, '0');
        const dd2 = String(tomorrow.getUTCDate()).padStart(2, '0');
        const tomorrowStr = `${yyyy2}-${mm2}-${dd2}`;
        const end = new Date(`${tomorrowStr}T00:00:00.000Z`).toISOString();

        // 1) buscar último ponto de hoje (para saber se “dia encerrado”)
        const { data: pontos, error: ptErr } = await supa
          .from('ponto_registro')
          .select('id, empresa_id, usuario_id, tipo, created_at, batida_at')
          .eq('empresa_id', empresaId)
          .eq('usuario_id', usuarioId)
          .gte('created_at', start)
          .lt('created_at', end)
          .order('created_at', { ascending: false })
          .limit(1);

        if (ptErr) throw ptErr;

        const last = (pontos?.[0] as PontoRow | undefined) ?? null;
        const lastTipo = (last?.tipo as string) ?? null;
        setUltimoTipoHoje(lastTipo);
        setDiaFinalizado(lastTipo === 'saida');

        const when = last?.batida_at || last?.created_at || null;
        setUltimaHora(when ? new Date(when).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null);

        // 2) buscar roteiro do dia (mesma regra do /ponto)
        const { data: r, error: rErr } = await supa
          .from('ponto_roteiros')
          .select(
            `
            tarefa_id,
            tarefas_padrao ( nome ),
            local_id,
            locais_permitidos ( nome ),
            data_dia,
            data_fim,
            status
          `
          )
          .eq('empresa_id', empresaId)
          .eq('usuario_id', usuarioId)
          .lte('data_dia', todayStr)
          .or(`data_fim.is.null,data_fim.gte.${todayStr}`)
          .in('status', ['planeado', 'ativo'])
          .order('data_dia', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (rErr) throw rErr;

        if (!alive) return;

        if ((r as any)?.tarefa_id) {
          setRoteiroHoje({
            tarefa_id: (r as any).tarefa_id,
            tarefa_nome: (r as any).tarefas_padrao?.nome || '—',
            local_id: (r as any).local_id ?? null,
            local_nome: (r as any).locais_permitidos?.nome ?? null,
          });
        } else {
          setRoteiroHoje(null);
        }
      } catch (e: any) {
        console.error('Erro ao carregar resumo do menu', e);
        if (alive) setErrResumo(e?.message || 'Falha ao carregar resumo do dia.');
      } finally {
        if (alive) setLoadingResumo(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [ready, role, usuarioId, empresaId, supa]);

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

  if (!ready || role === null) {
    return (
      <main style={{ padding: 24, fontFamily: 'system-ui' }}>
        <p style={{ color: '#666' }}>A carregar…</p>
      </main>
    );
  }

  const resumoStatus = (() => {
    if (loadingResumo) return 'A carregar roteiro e estado do dia…';
    if (errResumo) return errResumo;
    if (diaFinalizado) return `Dia encerrado${ultimaHora ? ` às ${ultimaHora}` : ''}.`;
    if (ultimoTipoHoje) return `Dia em curso${ultimaHora ? ` (última marcação ${ultimaHora})` : ''}.`;
    return 'Dia ainda não iniciado.';
  })();

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

      {/* Cabeçalho: role + nome + sair (mantido exatamente como estava) */}
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

      {/* NOVO: Resumo do dia no MENU (roteiro + estado do ponto) */}
      <section
        className="card"
        style={{
          border: '1px solid #E9EEF7',
          borderRadius: 16,
          padding: 16,
          background: '#fff',
          boxShadow: '0 1px 0 rgba(14,50,88,0.06)',
          marginTop: 16,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 900, color: '#0e3258', marginBottom: 6 }}>
          Roteiro de hoje
        </div>

        <div style={{ fontSize: 13, color: '#3F4A5F', lineHeight: 1.45 }}>
          {roteiroHoje ? (
            <>
              <div>
                <strong>Tarefa:</strong> {roteiroHoje.tarefa_nome}
              </div>
              <div style={{ marginTop: 4 }}>
                <strong>Local:</strong> {roteiroHoje.local_nome || '—'}
              </div>
            </>
          ) : (
            <div className="muted">Ainda não existe roteiro atribuído para hoje.</div>
          )}

          <div style={{ marginTop: 10, fontSize: 12, color: '#49546A' }}>
            <strong>Estado:</strong> {resumoStatus}
          </div>

          {errResumo && (
            <div style={{ marginTop: 10, fontSize: 12, color: 'crimson' }}>
              {errResumo}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          <a
            href="/ponto"
            style={{
              textDecoration: 'none',
              fontSize: 13,
              padding: '8px 12px',
              borderRadius: 10,
              border: 'none',
              background: '#0e3258',
              color: '#fff',
            }}
          >
            Ir para o Ponto
          </a>

          <a
            href="/ponto/historico"
            style={{
              textDecoration: 'none',
              fontSize: 13,
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid #D7E3FF',
              background: '#FFD24D',
              color: '#0e3258',
            }}
          >
            Ver histórico
          </a>
        </div>
      </section>

      {/* Cards do colaborador/externo */}
      <section
        className="grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 12,
          marginTop: 16,
        }}
      >
        <Card
          title="Marcar Ponto"
          desc="Registar ponto com foto e localização."
          actions={[{ href: '/ponto', label: 'Registar Agora', kind: 'primary' }]}
        />
        <Card
          title="Histórico"
          desc="Consultar marcações e estado (validado/pendente/recusado)."
          actions={[{ href: '/ponto/historico', label: 'Ver histórico', kind: 'accent' }]}
        />
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
        borderRadius: 16,
        padding: 16,
        background: '#fff',
        boxShadow: '0 1px 0 rgba(14,50,88,0.06)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: 140,
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
      </div>

      {!!actions.length && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {actions.map((a) => {
            const style = {
              textDecoration: 'none',
              fontSize: 13,
              padding: '8px 12px',
              borderRadius: 10,
              border: a.kind === 'primary' ? 'none' : '1px solid #D7E3FF',
              background: a.kind === 'primary' ? '#0e3258' : a.kind === 'accent' ? '#FFD24D' : '#fff',
              color: a.kind === 'primary' ? '#fff' : '#0e3258',
              opacity: a.disabled ? 0.55 : 1,
              cursor: a.disabled ? 'not-allowed' : 'pointer',
              pointerEvents: a.disabled ? 'none' : 'auto',
            } as React.CSSProperties;

            if (a.disabled) {
              return (
                <span key={a.href + a.label} style={style}>
                  {a.label}
                </span>
              );
            }

            return (
              <a key={a.href + a.label} href={a.href} style={style}>
                {a.label}
              </a>
            );
          })}
        </div>
      )}
    </article>
  );
}
