// app/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

type GeoState = {
  lat: number | null;
  lon: number | null;
  accuracy: number | null;
};

type RoteiroHojeRow = {
  id: string;
  data_dia: string;
  data_fim: string | null;
  status: string | null;

  tarefa_id: string;
  tarefa_nome: string | null;

  local_id: string | null;
  local_nome: string | null;
  local_lat: number | null;
  local_lng: number | null;
  local_radius_m: number | null;

  observacoes: string | null;

  // progresso / auditoria (colunas do ponto_roteiros)
  foto_bucket: string | null;
  foto_checkin_path: string | null;
  foto_checkout_path: string | null;
  almoco_saida_at: string | null;
  almoco_retorno_at: string | null;
  tarefa_concluida: boolean | null;
  justificativa: string | null;
};

type PontoRowLite = {
  id: string;
  tipo: string;
  created_at: string;
  batida_at: string | null;
  meta: any;
};

type TipoPonto = 'entrada' | 'saida' | 'saida_almoco' | 'retorno_almoco';

function statusLabel(s: string | null) {
  switch (s) {
    case 'planeado':
      return 'Planeado';
    case 'em_andamento':
      return 'Em andamento';
    case 'executado':
      return 'Executado';
    default:
      return s || '—';
  }
}

function tipoLabel(t: TipoPonto) {
  switch (t) {
    case 'entrada':
      return 'Check-in';
    case 'saida':
      return 'Check-out';
    case 'saida_almoco':
      return 'Saída almoço';
    case 'retorno_almoco':
      return 'Retorno almoço';
    default:
      return t;
  }
}

// legado
const isEntradaTipo = (t: string | null | undefined) => t === 'entrada' || t === 'in';

function tsOf(p: PontoRowLite) {
  const base = p.batida_at || p.created_at || '';
  const t = base ? new Date(base).getTime() : 0;
  return Number.isFinite(t) ? t : 0;
}

function dateKeyInTZ(d: Date, tz: string) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(d);

    const yyyy = parts.find((p) => p.type === 'year')?.value || '1970';
    const mm = parts.find((p) => p.type === 'month')?.value || '01';
    const dd = parts.find((p) => p.type === 'day')?.value || '01';
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function dateKeyFromIsoInTZ(iso: string, tz: string) {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  return dateKeyInTZ(d, tz);
}

export default function PontoPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);

  // ✅ Backend usa Zurich (teu RPC está fixo em Europe/Zurich)
  const TZ_BACKEND = 'Europe/Zurich';

  const [nome, setNome] = useState<string | null>(null);

  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  const [loadingUser, setLoadingUser] = useState(true);

  const [roteirosHoje, setRoteirosHoje] = useState<RoteiroHojeRow[]>([]);
  const [loadingRoteiros, setLoadingRoteiros] = useState(false);

  const [pontosHoje, setPontosHoje] = useState<PontoRowLite[]>([]);
  const [loadingPontos, setLoadingPontos] = useState(false);

  const [geo, setGeo] = useState<GeoState>({ lat: null, lon: null, accuracy: null });
  const [gettingGeo, setGettingGeo] = useState(false);

  const [batendo, setBatendo] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [roteiroSelecionado, setRoteiroSelecionado] = useState<RoteiroHojeRow | null>(null);
  const [acaoTipo, setAcaoTipo] = useState<TipoPonto>('entrada');

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Checkout: confirmação de tarefa + justificativa (só quando necessário)
  const [tarefaConcluida, setTarefaConcluida] = useState<boolean | null>(true);
  const [justificativa, setJustificativa] = useState<string>('');

  // almoço: justificativa opcional (backend só exige fora da janela no retorno)
  const [justificativaAlmoco, setJustificativaAlmoco] = useState<string>('');

  const hojeStr = useMemo(() => dateKeyInTZ(new Date(), TZ_BACKEND), []);

  // ---------- Helpers de jornada (DO DIA) ----------
  const jornada = useMemo(() => {
    const today = hojeStr;

    const isToday = (r: PontoRowLite) => {
      const base = r.batida_at || r.created_at || '';
      if (!base) return false;
      const k = dateKeyFromIsoInTZ(base, TZ_BACKEND);
      return k === today;
    };

    const hoje = pontosHoje.filter(isToday);

    const almocoOut = hoje.some((p) => p.tipo === 'saida_almoco');
    const almocoIn = hoje.some((p) => p.tipo === 'retorno_almoco');

    const anyCheckinToday = hoje.some((p) => isEntradaTipo(p.tipo));

    const lastCheckinRoteiroId = (() => {
      let bestTs = 0;
      let bestId: string | null = null;

      for (const p of hoje) {
        if (!isEntradaTipo(p.tipo)) continue;
        const rid = p?.meta?.roteiro_id ? String(p.meta.roteiro_id) : '';
        if (!rid) continue;
        const t = tsOf(p);
        if (t >= bestTs) {
          bestTs = t;
          bestId = rid;
        }
      }
      return bestId;
    })();

    return { anyCheckinToday, almocoOut, almocoIn, lastCheckinRoteiroId, hoje };
  }, [pontosHoje, hojeStr]);

  // ---------- Foto: upload no bucket privado ponto-fotos ----------
  async function uploadFoto(file: File, roteiroId: string, tipoAtual: TipoPonto) {
    if (!empresaId || !usuarioId) throw new Error('Sessão inválida para upload.');

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const dia = new Date().toISOString().slice(0, 10);

    const path = `${empresaId}/${usuarioId}/${dia}/${roteiroId}/${tipoAtual}-${ts}.${ext}`;

    const { error: upErr } = await supa.storage.from('ponto-fotos').upload(path, file, {
      upsert: false,
      contentType: file.type || 'image/jpeg',
    });

    if (upErr) throw upErr;

    return { bucket: 'ponto-fotos', path };
  }

  // ---------- Sessão + perfil ----------
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoadingUser(true);
        setErr(null);
        setMsg(null);

        const { data: authData, error: authError } = await supa.auth.getUser();
        if (authError) throw authError;
        if (!authData?.user) throw new Error('Sessão expirada. Faça login novamente.');

        const user = authData.user;
        const uid = user.id;
        if (!alive) return;

        setUsuarioId(uid);

        const { data: profile, error: profError } = await supa
          .from('profiles')
          .select('empresa_id, nome_exibicao, nome')
          .eq('user_id', uid)
          .maybeSingle();

        if (profError) throw profError;
        if (!profile) throw new Error('Perfil não encontrado. Contacte o administrador.');

        setEmpresaId(profile.empresa_id);
        setNome(profile.nome_exibicao || profile.nome || null);
      } catch (e: any) {
        console.error('Erro ao carregar utilizador/empresa', e);
        if (alive) setErr(e?.message || 'Falha ao carregar dados do utilizador.');
      } finally {
        if (alive) setLoadingUser(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [supa]);

  // ---------- Carregar roteiros do dia ----------
  async function carregarRoteirosHoje() {
    if (!empresaId || !usuarioId) return;

    setLoadingRoteiros(true);
    try {
      const { data, error } = await supa
        .from('ponto_roteiros')
        .select(
          `
          id,
          usuario_id,
          empresa_id,
          data_dia,
          data_fim,
          status,
          observacoes,
          tarefa_id,
          tarefas_padrao ( nome ),
          local_id,
          locais_permitidos ( nome, lat, lng, radius_m ),

          foto_bucket,
          foto_checkin_path,
          foto_checkout_path,
          almoco_saida_at,
          almoco_retorno_at,
          tarefa_concluida,
          justificativa
        `
        )
        .eq('empresa_id', empresaId)
        .eq('usuario_id', usuarioId)
        .lte('data_dia', hojeStr)
        .or(`data_fim.is.null,data_fim.gte.${hojeStr}`)
        .in('status', ['planeado', 'em_andamento', 'executado', 'ativo'])
        .order('data_dia', { ascending: false })
        .limit(50);

      if (error) throw error;

      const mapped: RoteiroHojeRow[] = (data || []).map((r: any) => ({
        id: r.id,
        data_dia: r.data_dia,
        data_fim: r.data_fim,
        status: r.status ?? null,
        tarefa_id: r.tarefa_id,
        tarefa_nome: r.tarefas_padrao?.nome ?? null,
        local_id: r.local_id ?? null,
        local_nome: r.locais_permitidos?.nome ?? null,
        local_lat: r.locais_permitidos?.lat ?? null,
        local_lng: r.locais_permitidos?.lng ?? null,
        local_radius_m: r.locais_permitidos?.radius_m ?? null,
        observacoes: r.observacoes ?? null,

        foto_bucket: r.foto_bucket ?? null,
        foto_checkin_path: r.foto_checkin_path ?? null,
        foto_checkout_path: r.foto_checkout_path ?? null,
        almoco_saida_at: r.almoco_saida_at ?? null,
        almoco_retorno_at: r.almoco_retorno_at ?? null,
        tarefa_concluida: typeof r.tarefa_concluida === 'boolean' ? r.tarefa_concluida : null,
        justificativa: r.justificativa ?? null,
      }));

      const score = (s: string | null) => (s === 'planeado' ? 0 : s === 'em_andamento' ? 1 : s === 'executado' ? 9 : 5);
      mapped.sort((a, b) => score(a.status) - score(b.status));

      setRoteirosHoje(mapped);
    } catch (e: any) {
      console.error('Erro ao carregar roteiros do dia', e);
    } finally {
      setLoadingRoteiros(false);
    }
  }

  // ---------- Carregar pontos (para jornada do dia) ----------
  async function carregarPontosHoje() {
    if (!empresaId || !usuarioId) return;

    setLoadingPontos(true);
    try {
      const { data, error } = await supa
        .from('ponto_registro')
        .select('id,tipo,created_at,batida_at,meta')
        .eq('empresa_id', empresaId)
        .eq('usuario_id', usuarioId)
        .order('created_at', { ascending: false })
        .limit(250);

      if (error) throw error;

      const rows = (data || []) as any[];
      setPontosHoje(
        rows.map((r) => ({
          id: r.id,
          tipo: r.tipo,
          created_at: r.created_at,
          batida_at: r.batida_at ?? null,
          meta: r.meta,
        }))
      );
    } catch (e: any) {
      console.error('Erro ao carregar pontos', e);
    } finally {
      setLoadingPontos(false);
    }
  }

  useEffect(() => {
    if (usuarioId && empresaId) {
      carregarRoteirosHoje();
      carregarPontosHoje();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioId, empresaId]);

  // ---------- Geo ----------
  async function obterGeo(): Promise<GeoState | null> {
    if (!('geolocation' in navigator)) {
      setErr('Geolocalização não disponível neste dispositivo.');
      return null;
    }

    setGettingGeo(true);
    setErr(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          const g = { lat: latitude, lon: longitude, accuracy: accuracy ?? null };
          setGeo(g);
          setGettingGeo(false);
          resolve(g);
        },
        (error) => {
          console.error('Erro geolocalização', error);
          let msg2 = 'Não foi possível obter a localização.';
          if (error.code === error.PERMISSION_DENIED) {
            msg2 = 'Permissão de localização negada. Ative a localização para poder marcar ponto.';
          }
          setErr(msg2);
          setGettingGeo(false);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  }

  // haversine
  function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const toRad = (v: number) => (v * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function validarRaioPorRoteiro(g: GeoState, r: RoteiroHojeRow) {
    if (g.lat == null || g.lon == null) return { ok: true, motivo: 'Sem geo' };

    if (r.local_lat != null && r.local_lng != null) {
      const d = distanceMeters(g.lat, g.lon, Number(r.local_lat), Number(r.local_lng));
      const raio = Number(r.local_radius_m ?? 0);

      if (raio > 0 && d > raio) {
        return {
          ok: false,
          motivo: `Fora da zona permitida. Distância ~${d.toFixed(1)}m (raio permitido ${raio}m).`,
          dist: d,
          raio,
        };
      }

      return {
        ok: true,
        motivo: `Dentro da zona permitida. Distância ~${d.toFixed(1)}m (raio ${raio}m).`,
        dist: d,
        raio,
      };
    }

    return { ok: true, motivo: 'Local do roteiro sem lat/lng; ponto registado sem validação de raio.' };
  }

  // ---------- Helpers UI ----------
  function isDoneCheckin(r: RoteiroHojeRow) {
    return !!r.foto_checkin_path || r.status === 'em_andamento' || r.status === 'executado';
  }
  function isDoneCheckout(r: RoteiroHojeRow) {
    return !!r.foto_checkout_path || r.status === 'executado';
  }

  function canCheckin(r: RoteiroHojeRow) {
    return !isDoneCheckin(r) && (r.status === 'planeado' || !r.status);
  }

  function canCheckout(r: RoteiroHojeRow) {
    if (!isDoneCheckin(r)) return false;
    if (isDoneCheckout(r)) return false;

    // almoço do dia: se saiu e não voltou, bloqueia checkout
    if (jornada.almocoOut && !jornada.almocoIn) return false;

    return true;
  }

  // ---------- Ações ----------
  async function iniciarAcaoComFoto(roteiro: RoteiroHojeRow, tipo: 'entrada' | 'saida') {
    setErr(null);
    setMsg(null);
    setPhotoPreview(null);
    setRoteiroSelecionado(roteiro);
    setAcaoTipo(tipo);

    if (tipo === 'saida') {
      setTarefaConcluida(true);
      setJustificativa('');
    }

    if (fileInputRef.current) fileInputRef.current.click();
  }

  async function executarAlmoco(tipo: 'saida_almoco' | 'retorno_almoco') {
    setBatendo(true);
    setErr(null);
    setMsg(null);

    try {
      if (!jornada.anyCheckinToday) {
        throw new Error('almoco_requires_checkin_today');
      }

      const g = await obterGeo();
      if (!g) return;

      // almoço amarrado ao último check-in do dia
      const roteiroIdParaRpc = jornada.lastCheckinRoteiroId || roteirosHoje[0]?.id || null;
      if (!roteiroIdParaRpc) throw new Error('roteiro_required');

      const meta: Record<string, any> = {
        origem: 'externo-web',
        device: 'browser',
        lat: g.lat,
        lon: g.lon,
        accuracy: g.accuracy,
        jornada_dia: true,
        roteiro_id: roteiroIdParaRpc,
      };

      if (tipo === 'retorno_almoco' && justificativaAlmoco.trim()) {
        meta.justificativa = justificativaAlmoco.trim();
      }

      const { error } = await supa.rpc('rpc_ponto_bater', {
        p_tipo: tipo,
        p_roteiro_id: roteiroIdParaRpc,
        p_meta: meta,
      });

      if (error) throw error;

      setMsg(`${tipoLabel(tipo)} registado com sucesso.`);
      await Promise.all([carregarPontosHoje(), carregarRoteirosHoje()]);
    } catch (e: any) {
      const m = String(e?.message || '');

      // mapeamento consistente (sem “mensagem crua”)
      if (m.includes('almoco_requires_checkin_today')) {
        setErr('Para registar o almoço, é necessário ter pelo menos um Check-in hoje.');
      } else if (m.includes('almoco_retorno_sem_saida') || m.includes('almoco_out_required_before_return')) {
        setErr('Registe primeiro a Saída do almoço antes do Retorno.');
      } else if (m.includes('almoco_saida_ja_registada')) {
        setErr('A Saída do almoço já foi registada hoje.');
      } else if (m.includes('almoco_retorno_ja_registado')) {
        setErr('O Retorno do almoço já foi registado hoje.');
      } else if (m.includes('almoco_duracao_fora_da_janela_exige_justificativa')) {
        // Se aparecer na SAÍDA, é backend desatualizado. Com a migration abaixo isso some.
        setErr('Duração do almoço fora de 60–65 min: informe justificativa no Retorno. (Se isto apareceu na Saída, atualize o RPC com a migration.)');
      } else if (m.includes('roteiro_required')) {
        setErr('Para registar o almoço, faça primeiro um Check-in numa atividade.');
      } else {
        setErr(e?.message || 'Falha ao registar o almoço.');
      }
    } finally {
      setBatendo(false);
    }
  }

  async function baterPontoComFoto(file: File) {
    if (!roteiroSelecionado) {
      setErr('Selecione uma atividade.');
      return;
    }

    setBatendo(true);
    setErr(null);
    setMsg(null);

    try {
      const g = await obterGeo();
      if (!g) return;

      const raioCheck = validarRaioPorRoteiro(g, roteiroSelecionado);
      if (!raioCheck.ok) {
        setErr(
          `Não foi possível registar ponto: ${raioCheck.motivo} ` +
            'Fale com o responsável ou verifique se está no local correto.'
        );
        return;
      }

      const fotoInfo = await uploadFoto(file, roteiroSelecionado.id, acaoTipo);

      const meta: Record<string, any> = {
        origem: 'externo-web',
        device: 'browser',
        lat: g.lat,
        lon: g.lon,
        accuracy: g.accuracy,
        raio_validacao: raioCheck.motivo,
        roteiro_id: roteiroSelecionado.id,
        tarefa_id: roteiroSelecionado.tarefa_id,
        tarefa_nome: roteiroSelecionado.tarefa_nome,
        roteiro_local_id: roteiroSelecionado.local_id,
        roteiro_local_nome: roteiroSelecionado.local_nome,
        foto_bucket: fotoInfo.bucket,
        foto_path: fotoInfo.path,
        foto_capturada: true,
      };

      if (acaoTipo === 'saida') {
        const concl = tarefaConcluida === true;
        meta.tarefa_concluida = concl;

        if (!concl) {
          const just = justificativa.trim();
          if (!just) {
            setErr('Para finalizar sem concluir a tarefa, a justificativa é obrigatória.');
            return;
          }
          meta.justificativa = just;
        }
      }

      const { error } = await supa.rpc('rpc_ponto_bater', {
        p_tipo: acaoTipo,
        p_roteiro_id: roteiroSelecionado.id,
        p_meta: meta,
      });

      if (error) throw error;

      setMsg(acaoTipo === 'entrada' ? 'Check-in registado com sucesso.' : 'Check-out registado com sucesso.');
      setPhotoPreview(null);
      setRoteiroSelecionado(null);

      await Promise.all([carregarPontosHoje(), carregarRoteirosHoje()]);
    } catch (e: any) {
      console.error('Erro ao bater ponto', e);
      setErr(e?.message || 'Falha ao registar ponto.');
    } finally {
      setBatendo(false);
    }
  }

  async function onPhotoChange(e: any) {
    const file = e.target.files?.[0] || null;
    e.target.value = '';

    if (!file) {
      setPhotoPreview(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === 'string' ? reader.result : null;
      setPhotoPreview(url);
    };
    reader.readAsDataURL(file);

    await baterPontoComFoto(file);
  }

  if (loadingUser) {
    return (
      <main style={{ padding: 16, fontFamily: 'system-ui' }}>
        <p style={{ color: '#666' }}>A carregar dados do utilizador…</p>
      </main>
    );
  }

  if (err && !usuarioId) {
    return (
      <main style={{ padding: 16, fontFamily: 'system-ui' }}>
        <p style={{ color: 'crimson', marginBottom: 8 }}>{err}</p>
        <p style={{ color: '#666' }}>Tente sair e entrar novamente.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 16, fontFamily: 'system-ui', maxWidth: 1100, margin: '0 auto' }}>
      {/* HEADER */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <img
          src="https://cfremxfgqehqnbqummti.supabase.co/storage/v1/object/public/images/app-novo.png"
          alt="CONFIANCE"
          style={{ height: 28, width: 'auto', display: 'block' }}
        />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, color: '#6b7280', lineHeight: 1.1 }}>
            Confiance
          </div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#0e3258', lineHeight: 1.1 }}>Ponto</div>
        </div>

        <a
          href="/menu"
          className="btn btn-ghost"
          style={{
            marginLeft: 'auto',
            textDecoration: 'none',
            padding: '8px 12px',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: '#fff',
            color: '#0e3258',
            fontWeight: 700,
            fontSize: 13,
            whiteSpace: 'nowrap',
          }}
        >
          ← Voltar
        </a>
      </header>

      <header style={{ marginBottom: 12 }}>
        <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#49546A' }}>
          {nome ? `Olá, ${nome}. Registe os pontos da sua atividade.` : 'Registe os pontos da sua atividade.'}
        </p>
      </header>

      {/* Input foto escondido */}
      <input
        ref={fileInputRef}
        id="foto-ponto-input"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onPhotoChange}
        style={{ display: 'none' }}
      />

      {/* ✅ 1) Atividades (Check-in / Check-out PRIMEIRO) */}
      <section className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <h2 className="h2" style={{ margin: 0 }}>
            Atividades do dia
          </h2>

          <button
            className="btn btn-ghost"
            onClick={async () => {
              setMsg(null);
              setErr(null);
              await Promise.all([carregarRoteirosHoje(), carregarPontosHoje()]);
            }}
            disabled={loadingRoteiros || loadingPontos || batendo}
          >
            {loadingRoteiros || loadingPontos ? 'Atualizando…' : 'Atualizar'}
          </button>
        </div>

        {(loadingRoteiros || loadingPontos) && <p className="muted" style={{ marginTop: 10 }}>A carregar…</p>}

        {!loadingRoteiros && !roteirosHoje.length && (
          <p className="muted" style={{ marginTop: 10 }}>Nenhuma atividade atribuída para hoje.</p>
        )}

        {!!roteirosHoje.length && (
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            {roteirosHoje.map((r) => {
              const st = r.status || 'planeado';

              const okCheckin = isDoneCheckin(r);
              const okCheckout = isDoneCheckout(r);

              const btnCheckin = canCheckin(r);
              const btnCheckout = canCheckout(r);

              return (
                <article
                  key={r.id}
                  style={{
                    border: '1px solid #E9EEF7',
                    borderRadius: 14,
                    padding: 14,
                    background: '#fff',
                    boxShadow: '0 1px 0 rgba(14,50,88,0.06)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 900, color: '#0e3258' }}>
                        {r.tarefa_nome || 'Tarefa'}
                      </div>
                      <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                        Local: {r.local_nome || '—'}
                      </div>
                      {r.observacoes ? (
                        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                          Obs.: {r.observacoes}
                        </div>
                      ) : null}
                    </div>

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
                      {statusLabel(st)}
                    </span>
                  </div>

                  {/* ✅ Ordem correta: Check-in / Check-out */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                    <button className="btn btn-primary" disabled={!btnCheckin || batendo} onClick={() => iniciarAcaoComFoto(r, 'entrada')}>
                      {batendo && roteiroSelecionado?.id === r.id && acaoTipo === 'entrada' ? 'A registar…' : 'Check-in'}
                    </button>

                    <button
                      className="btn btn-ghost"
                      style={{ background: '#FFD24D', border: 'none', fontWeight: 900, color: '#0e3258' }}
                      disabled={!btnCheckout || batendo}
                      onClick={() => iniciarAcaoComFoto(r, 'saida')}
                    >
                      {batendo && roteiroSelecionado?.id === r.id && acaoTipo === 'saida' ? 'A registar…' : 'Check-out'}
                    </button>
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      display: 'flex',
                      gap: 10,
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      borderTop: '1px solid #EEF2FF',
                      paddingTop: 10,
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#0e3258' }}>Registos da atividade</span>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <StagePill label="Check-in" ok={okCheckin} />
                      <StagePill label="Check-out" ok={okCheckout} />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ✅ 2) Almoço DO DIA (aparece depois) */}
      <section className="card" style={{ marginBottom: 12, maxWidth: 680 }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: '#0e3258', marginBottom: 8 }}>Pausa de almoço (do dia)</div>
        <p className="muted" style={{ fontSize: 12, marginTop: 0, marginBottom: 10 }}>
          O almoço é registado <strong>uma vez por dia</strong> e só fica disponível após existir pelo menos um <strong>Check-in</strong> hoje.
        </p>

        <div style={{ display: 'grid', gap: 10 }}>
          <StepRow
            title="Saída almoço"
            desc={jornada.anyCheckinToday ? '' : 'Faça pelo menos um Check-in hoje para liberar o almoço.'}
            done={jornada.almocoOut}
            actionLabel="Registar saída"
            disabled={!jornada.anyCheckinToday || jornada.almocoOut || batendo}
            onClick={() => executarAlmoco('saida_almoco')}
          />

          <StepRow
            title="Retorno almoço"
            desc="O retorno deve ocorrer entre 60 e 65 minutos. Se precisar diferente, informe justificativa."
            done={jornada.almocoIn}
            actionLabel="Registar retorno"
            disabled={!jornada.almocoOut || jornada.almocoIn || batendo}
            onClick={() => executarAlmoco('retorno_almoco')}
          />

          {(!jornada.almocoIn && jornada.almocoOut) && (
            <div style={{ marginTop: 4 }}>
              <label className="muted">Justificativa (se almoço for diferente de 60–65 min)</label>
              <textarea
                value={justificativaAlmoco}
                onChange={(e) => setJustificativaAlmoco(e.target.value)}
                rows={3}
                placeholder="Ex.: Consulta rápida, urgência no local, etc."
                style={{
                  width: '100%',
                  padding: 10,
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  resize: 'vertical',
                  marginTop: 6,
                }}
              />
            </div>
          )}
        </div>

        {gettingGeo && <p className="muted" style={{ marginTop: 10 }}>A obter localização do dispositivo…</p>}
        {err && <p style={{ color: 'crimson', marginTop: 10 }}>{err}</p>}
        {msg && <p style={{ color: 'green', marginTop: 10 }}>{msg}</p>}
      </section>

      {/* ✅ Confirmação do checkout (mantido) */}
      <section className="card" style={{ marginBottom: 16, maxWidth: 520 }}>
        <h2 className="h2" style={{ marginBottom: 12 }}>
          Confirmar registo
        </h2>

        <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
          Para check-in e check-out, a câmara abre e o registo é feito após confirmar a foto.
        </p>

        {photoPreview && (
          <div style={{ marginTop: 10 }}>
            <img
              src={photoPreview}
              alt="Pré-visualização"
              style={{ maxWidth: '100%', maxHeight: 260, borderRadius: 10, border: '1px solid var(--border)' }}
            />
          </div>
        )}

        {roteiroSelecionado && acaoTipo === 'saida' && (
          <div style={{ marginTop: 12 }}>
            <label className="muted" style={{ display: 'block', marginBottom: 8 }}>
              Conclusão da tarefa
            </label>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <label style={radioLabelStyle}>
                <input type="radio" name="tarefaConcluida" checked={tarefaConcluida === true} onChange={() => setTarefaConcluida(true)} />
                <span>Concluída</span>
              </label>

              <label style={radioLabelStyle}>
                <input type="radio" name="tarefaConcluida" checked={tarefaConcluida === false} onChange={() => setTarefaConcluida(false)} />
                <span>Não concluída</span>
              </label>
            </div>

            {tarefaConcluida === false && (
              <div style={{ marginTop: 10 }}>
                <label className="muted">Justificativa</label>
                <textarea
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  rows={3}
                  placeholder="Obrigatório quando não concluída."
                  style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid var(--border)', resize: 'vertical' }}
                />
              </div>
            )}
          </div>
        )}

        <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
          Validação de localização ativa (quando configurada no roteiro).
        </p>

        <a
          href="/ponto/historico"
          className="btn btn-ghost"
          style={{
            display: 'inline-block',
            marginTop: 8,
            textDecoration: 'none',
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: '#fff',
            color: '#0e3258',
            fontWeight: 700,
            fontSize: 13,
            textAlign: 'center',
          }}
        >
          Ver histórico
        </a>
      </section>
    </main>
  );
}

function StagePill({ label, ok }: { label: string; ok: boolean }) {
  const bg = ok ? '#E9FBEF' : '#FFF7D6';
  const border = ok ? '#BDECCB' : '#FFE59A';
  const color = '#0e3258';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        borderRadius: 999,
        border: `1px solid ${border}`,
        background: bg,
        fontSize: 12,
        fontWeight: 800,
        color,
        whiteSpace: 'nowrap',
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 13 }}>
        {ok ? '✅' : '🕒'}
      </span>
      <span>{label}</span>
    </span>
  );
}

function StepRow({
  title,
  desc,
  done,
  actionLabel,
  disabled,
  onClick,
}: {
  title: string;
  desc: string;
  done: boolean;
  actionLabel: string;
  disabled: boolean;
  onClick: () => void;
}) {
  const badge = done ? '✓' : '🕒';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '28px 1fr auto',
        gap: 10,
        alignItems: 'center',
        padding: 12,
        border: '1px solid #E9EEF7',
        borderRadius: 14,
        background: '#fff',
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          display: 'grid',
          placeItems: 'center',
          background: done ? '#E8FFF1' : '#FFF7E6',
          border: done ? '1px solid #BDE6C8' : '1px solid #FFD08A',
          color: '#0e3258',
          fontWeight: 900,
        }}
        aria-label={done ? 'Concluído' : 'Pendente'}
      >
        {badge}
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: '#0e3258' }}>{title}</div>
        {desc ? (
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
            {desc}
          </div>
        ) : null}
      </div>

      <button className="btn btn-ghost" disabled={disabled} onClick={onClick}>
        {actionLabel}
      </button>
    </div>
  );
}

const radioLabelStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  padding: '8px 10px',
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: '#fff',
  fontSize: 13,
  cursor: 'pointer',
};
