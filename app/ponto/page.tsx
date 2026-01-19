///app/ponto/page.tsx
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
};

type TipoPonto = 'entrada' | 'saida_almoco' | 'retorno_almoco' | 'saida';

type PontoRowLite = {
  id: string;
  tipo: string;
  created_at: string;
  batida_at: string | null;
  meta: any;
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
    case 'saida_almoco':
      return 'Saída almoço';
    case 'retorno_almoco':
      return 'Retorno almoço';
    case 'saida':
      return 'Check-out';
    default:
      return t;
  }
}

function msToMin(ms: number) {
  return Math.round(ms / 60000);
}

export default function PontoPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [nome, setNome] = useState<string | null>(null);

  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  const [loadingUser, setLoadingUser] = useState(true);

  const [roteirosHoje, setRoteirosHoje] = useState<RoteiroHojeRow[]>([]);
  const [loadingRoteiros, setLoadingRoteiros] = useState(false);

  const [pontosHoje, setPontosHoje] = useState<PontoRowLite[]>([]);
  const [loadingPontosHoje, setLoadingPontosHoje] = useState(false);

  const [geo, setGeo] = useState<GeoState>({ lat: null, lon: null, accuracy: null });
  const [gettingGeo, setGettingGeo] = useState(false);

  const [batendo, setBatendo] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // seleção de tarefa (roteiro)
  const [roteiroSelecionadoId, setRoteiroSelecionadoId] = useState<string>('');
  const roteiroSelecionado = useMemo(() => {
    return roteirosHoje.find((r) => r.id === roteiroSelecionadoId) || null;
  }, [roteirosHoje, roteiroSelecionadoId]);

  // fluxo de ação
  const [acaoTipo, setAcaoTipo] = useState<TipoPonto>('entrada');
  const [pendingFotoFile, setPendingFotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // checkout: conclusão + justificativa condicional
  const [tarefaConcluida, setTarefaConcluida] = useState<boolean | null>(null);
  const [justificativa, setJustificativa] = useState<string>('');

  // almoço (A: almoço é do dia, desvinculado do roteiro)
  const [almocoJustificativa, setAlmocoJustificativa] = useState<string>('');
  const [confirmRetornoAlmoco, setConfirmRetornoAlmoco] = useState(false);
  const [retornoAlmocoMin, setRetornoAlmocoMin] = useState<number | null>(null);
  const [retornoAlmocoExigeJust, setRetornoAlmocoExigeJust] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const hojeStr = todayLocalStr();

  // ---------- Helpers de “jornada do dia” (A: almoço é do dia) ----------
  const jornada = useMemo(() => {
    const today = hojeStr;

    const isToday = (r: PontoRowLite) => {
      const base = r.created_at || r.batida_at || '';
      if (!base) return false;
      return localDateStrFromIso(base) === today;
    };

    const hoje = pontosHoje.filter(isToday);

    const sortByTimeAsc = (a: PontoRowLite, b: PontoRowLite) => {
      const ta = new Date(a.batida_at || a.created_at).getTime();
      const tb = new Date(b.batida_at || b.created_at).getTime();
      return ta - tb;
    };

    const hojeAsc = [...hoje].sort(sortByTimeAsc);

    // ✅ check-in do dia (qualquer tarefa)
    const checkinAny = hojeAsc.some((p) => p.tipo === 'entrada');

    // almoço: pegamos a última saída almoço e o último retorno almoço
    const lastSaida = [...hojeAsc].reverse().find((p) => p.tipo === 'saida_almoco') || null;
    const lastRetorno = [...hojeAsc].reverse().find((p) => p.tipo === 'retorno_almoco') || null;

    const almocoOut = !!lastSaida;
    const almocoIn = !!lastRetorno;

    const almocoOutAt = lastSaida ? (lastSaida.batida_at || lastSaida.created_at) : null;
    const almocoInAt = lastRetorno ? (lastRetorno.batida_at || lastRetorno.created_at) : null;

    // seleção atual
    const selId = roteiroSelecionado?.id || null;

    // check-in/out por tarefa (roteiro)
    const checkin = selId
      ? hojeAsc.some((p) => p.tipo === 'entrada' && String(p?.meta?.roteiro_id || '') === selId)
      : false;

    const checkout = selId
      ? hojeAsc.some((p) => p.tipo === 'saida' && String(p?.meta?.roteiro_id || '') === selId)
      : false;

    return {
      checkinAny,
      almocoOut,
      almocoIn,
      almocoOutAt,
      almocoInAt,
      checkin,
      checkout,
    };
  }, [pontosHoje, hojeStr, roteiroSelecionado]);

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

  // ---------- Carregar roteiros do dia (multi-roteiro) ----------
  async function carregarRoteirosHoje() {
    if (!empresaId || !usuarioId) return;

    setLoadingRoteiros(true);
    try {
      const todayStr = todayLocalStr();

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
          locais_permitidos ( nome, lat, lng, radius_m )
        `
        )
        .eq('empresa_id', empresaId)
        .eq('usuario_id', usuarioId)
        .lte('data_dia', todayStr)
        .or(`data_fim.is.null,data_fim.gte.${todayStr}`)
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
      }));

      const score = (s: string | null) => (s === 'planeado' ? 0 : s === 'em_andamento' ? 1 : s === 'executado' ? 9 : 5);
      mapped.sort((a, b) => score(a.status) - score(b.status));

      setRoteirosHoje(mapped);

      const firstActive = mapped.find((r) => (r.status || 'planeado') !== 'executado') || mapped[0] || null;
      if (firstActive && !roteiroSelecionadoId) {
        setRoteiroSelecionadoId(firstActive.id);
      }
      if (!firstActive) setRoteiroSelecionadoId('');
    } catch (e: any) {
      console.error('Erro ao carregar roteiros do dia', e);
    } finally {
      setLoadingRoteiros(false);
    }
  }

  // ---------- Carregar pontos (para controlar almoço do dia) ----------
  async function carregarPontosHoje() {
    if (!empresaId || !usuarioId) return;

    setLoadingPontosHoje(true);
    try {
      const { data, error } = await supa
        .from('ponto_registro')
        .select('id,tipo,created_at,batida_at,meta')
        .eq('empresa_id', empresaId)
        .eq('usuario_id', usuarioId)
        .order('created_at', { ascending: false })
        .limit(200);

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
      setLoadingPontosHoje(false);
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

  // ---------- Regras de habilitação ----------
  const regras = useMemo(() => {
    const r = roteiroSelecionado;
    const st = r?.status || 'planeado';

    // por tarefa
    const podeCheckin = !!r && st === 'planeado';

    // almoço é do dia:
    // ✅ exige pelo menos 1 check-in hoje (qualquer tarefa)
    // ✅ só 1 vez por dia
    const podeAlmocoOut = jornada.checkinAny && !jornada.almocoOut;
    const podeAlmocoIn = jornada.almocoOut && !jornada.almocoIn;

    // Se saiu para almoço, exige retorno antes do checkout (da tarefa selecionada)
    const bloqueioCheckoutPorAlmoco = jornada.almocoOut && !jornada.almocoIn;

    const podeCheckout = !!r && st === 'em_andamento' && !jornada.checkout && !bloqueioCheckoutPorAlmoco;

    return {
      st,
      podeCheckin,
      podeAlmocoOut,
      podeAlmocoIn,
      podeCheckout,
      bloqueioCheckoutPorAlmoco,
    };
  }, [roteiroSelecionado, jornada]);

  const temAtividadeAtiva = useMemo(() => {
    if (!roteiroSelecionado) return false;
    const st = roteiroSelecionado.status || 'planeado';
    return st !== 'executado';
  }, [roteiroSelecionado]);

  // ---------- Ações ----------
  function resetAcaoUI() {
    setPendingFotoFile(null);
    setPhotoPreview(null);
    setTarefaConcluida(null);
    setJustificativa('');
    setAlmocoJustificativa('');
    setConfirmRetornoAlmoco(false);
    setRetornoAlmocoMin(null);
    setRetornoAlmocoExigeJust(false);
  }

  function calcularRegraRetornoAlmoco() {
    if (!jornada.almocoOutAt) {
      return { ok: false, min: null, exigeJust: false, motivo: 'Não existe saída de almoço registada hoje.' };
    }
    const outAt = new Date(jornada.almocoOutAt).getTime();
    const now = Date.now();
    const min = msToMin(now - outAt);

    const exigeJust = min < 60 || min > 65;

    return { ok: true, min, exigeJust, motivo: '' };
  }

  async function iniciarAcao(tipo: TipoPonto) {
    setErr(null);
    setMsg(null);
    resetAcaoUI();
    setAcaoTipo(tipo);

    // ✅ almoço é do dia — não exige roteiro selecionado
    if (tipo === 'saida_almoco') {
      if (!jornada.checkinAny) {
        setErr('Para sair para almoço, precisa existir pelo menos 1 check-in hoje.');
        return;
      }
      if (jornada.almocoOut) {
        setErr('A saída de almoço já foi registada hoje.');
        return;
      }
      await baterPonto('saida_almoco', null);
      return;
    }

    if (tipo === 'retorno_almoco') {
      if (!jornada.almocoOut) {
        setErr('Não existe saída de almoço registada hoje.');
        return;
      }
      if (jornada.almocoIn) {
        setErr('O retorno de almoço já foi registado hoje.');
        return;
      }

      const r = calcularRegraRetornoAlmoco();
      if (!r.ok) {
        setErr(r.motivo || 'Não foi possível calcular o tempo de almoço.');
        return;
      }

      setRetornoAlmocoMin(r.min);
      setRetornoAlmocoExigeJust(r.exigeJust);

      // se exigir justificativa, abre confirmação
      if (r.exigeJust) {
        setConfirmRetornoAlmoco(true);
        return;
      }

      await baterPonto('retorno_almoco', null);
      return;
    }

    // ✅ check-in / check-out continuam por tarefa selecionada
    if (!roteiroSelecionado) {
      setErr('Nenhuma atividade selecionada.');
      return;
    }

    const exigeFoto = tipo === 'entrada' || tipo === 'saida';
    if (exigeFoto) {
      if (fileInputRef.current) fileInputRef.current.click();
      return;
    }

    await baterPonto(tipo, null);
  }

  async function baterPonto(tipo: TipoPonto, file: File | null) {
    setBatendo(true);
    setErr(null);
    setMsg(null);

    try {
      const g = await obterGeo();
      if (!g) return;

      // validação de raio: só para check-in/out (porque almoço é do dia e pode acontecer fora do local)
      if (tipo === 'entrada' || tipo === 'saida') {
        if (!roteiroSelecionado) {
          setErr('Nenhuma atividade selecionada.');
          return;
        }

        const raioCheck = validarRaioPorRoteiro(g, roteiroSelecionado);
        if (!raioCheck.ok) {
          setErr(
            `Não foi possível registar ponto: ${raioCheck.motivo} ` +
              'Fale com o responsável ou verifique se está no local correto.'
          );
          return;
        }
      }

      // checkout: exige decisão de conclusão
      if (tipo === 'saida') {
        if (!roteiroSelecionado) {
          setErr('Nenhuma atividade selecionada.');
          return;
        }

        if (tarefaConcluida === null) {
          setErr('Informe se a tarefa foi concluída para finalizar o check-out.');
          return;
        }
        if (tarefaConcluida === false && !justificativa.trim()) {
          setErr('Para finalizar sem concluir a tarefa, a justificativa é obrigatória.');
          return;
        }

        if (regras.bloqueioCheckoutPorAlmoco) {
          setErr('Para fazer check-out, precisa registar o retorno do almoço.');
          return;
        }
      }

      // retorno almoço: aplica regra 60-65 e exige justificativa fora da janela
      if (tipo === 'retorno_almoco') {
        const r = calcularRegraRetornoAlmoco();
        if (!r.ok) {
          setErr(r.motivo || 'Não foi possível calcular o tempo de almoço.');
          return;
        }
        if ((r.min ?? 0) < 60 || (r.min ?? 0) > 65) {
          if (!almocoJustificativa.trim()) {
            setErr('O tempo de almoço ficou fora do intervalo (60 a 65 min). Justificativa é obrigatória.');
            return;
          }
        }
      }

      let fotoInfo: { bucket: string; path: string } | null = null;

      // foto só para 1 e 4
      if (tipo === 'entrada' || tipo === 'saida') {
        if (!roteiroSelecionado) {
          setErr('Nenhuma atividade selecionada.');
          return;
        }

        if (!file) {
          setErr('Foto obrigatória. Abra a câmara e tire a foto para continuar.');
          return;
        }
        fotoInfo = await uploadFoto(file, roteiroSelecionado.id, tipo);
      }

      const meta: Record<string, any> = {
        origem: 'externo-web',
        device: 'browser',
        lat: g.lat,
        lon: g.lon,
        accuracy: g.accuracy,
        jornada_dia: true,
      };

      // vínculo de auditoria:
      // - check-in/out sempre com roteiro
      // - almoço: deixa contexto do roteiro selecionado (se existir), mas regra é do dia
      if (roteiroSelecionado) {
        meta.roteiro_id = roteiroSelecionado.id;
        meta.tarefa_id = roteiroSelecionado.tarefa_id;
        meta.tarefa_nome = roteiroSelecionado.tarefa_nome;
        meta.roteiro_local_id = roteiroSelecionado.local_id;
        meta.roteiro_local_nome = roteiroSelecionado.local_nome;
      }

      if (fotoInfo) {
        meta.foto_bucket = fotoInfo.bucket;
        meta.foto_path = fotoInfo.path;
        meta.foto_capturada = true;
      }

      if (tipo === 'saida') {
        meta.tarefa_concluida = tarefaConcluida;
        if (tarefaConcluida === false) meta.justificativa = justificativa.trim();
      }

      if (tipo === 'retorno_almoco') {
        const r = calcularRegraRetornoAlmoco();
        if (r.ok) {
          meta.almoco_minutos = r.min;
          meta.almoco_exige_justificativa = r.exigeJust;
        }
        if (almocoJustificativa.trim()) meta.justificativa = almocoJustificativa.trim();
      }

      // ✅ RPC: check-in/out seguem com roteiro obrigatório;
      // ✅ almoço pode ir com roteiro selecionado (contexto) — mas regra é do dia e será reforçada no RPC
      const { error } = await supa.rpc('rpc_ponto_bater', {
        p_tipo: tipo,
        p_meta: meta,
        p_roteiro_id: roteiroSelecionado ? roteiroSelecionado.id : null,
      });

      if (error) throw error;

      setMsg(`${tipoLabel(tipo)} registado com sucesso.`);
      resetAcaoUI();

      await Promise.all([carregarRoteirosHoje(), carregarPontosHoje()]);
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
      setPendingFotoFile(null);
      return;
    }

    setPendingFotoFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === 'string' ? reader.result : null;
      setPhotoPreview(url);
    };
    reader.readAsDataURL(file);

    // Check-in é automático
    if (acaoTipo === 'entrada') {
      await baterPonto('entrada', file);
    }
    // Checkout: pendente (vai na confirmação)
  }

  const outrasAtividades = useMemo(() => {
    const sel = roteiroSelecionadoId;
    return roteirosHoje.filter((r) => r.id !== sel);
  }, [roteirosHoje, roteiroSelecionadoId]);

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

  const selectedStatus = roteiroSelecionado?.status || 'planeado';

  const mostrarConfirmacaoCheckout =
    temAtividadeAtiva &&
    (acaoTipo === 'saida' &&
      !jornada.checkout &&
      (!!photoPreview || !!pendingFotoFile || tarefaConcluida !== null || batendo));

  const mostrarConfirmacaoRetornoAlmoco = confirmRetornoAlmoco;

  return (
    <main
      style={{
        padding: 16,
        fontFamily: 'system-ui',
        maxWidth: 1100,
        margin: '0 auto',
      }}
    >
      {/* HEADER */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
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
            Confiance
          </div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#0e3258', lineHeight: 1.1 }}>
            Jornada de hoje
          </div>
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

      {/* Subheader */}
      <header style={{ marginBottom: 14 }}>
        <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#49546A' }}>
          {nome ? `Olá, ${nome}. Registe a sua jornada com foto e localização.` : 'Registe a sua jornada com foto e localização.'}
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

      {/* Seletor de atividade */}
      <section
        className="card"
        style={{
          border: '1px solid #E9EEF7',
          borderRadius: 16,
          padding: 16,
          background: '#fff',
          boxShadow: '0 1px 0 rgba(14,50,88,0.06)',
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 900, color: '#0e3258' }}>Atividade atual</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              Verifique aqui a(s) atividade(s) programada(s) para o dia.
            </div>
          </div>

          <button
            className="btn btn-ghost"
            onClick={async () => {
              setMsg(null);
              setErr(null);
              await Promise.all([carregarRoteirosHoje(), carregarPontosHoje()]);
            }}
            disabled={loadingRoteiros || loadingPontosHoje || batendo}
          >
            {loadingRoteiros || loadingPontosHoje ? 'Atualizando…' : 'Atualizar'}
          </button>
        </div>

        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          <div>
            <label className="muted">Selecionar atividade</label>
            <select
              value={roteiroSelecionadoId}
              onChange={(e) => {
                setErr(null);
                setMsg(null);
                resetAcaoUI();
                setRoteiroSelecionadoId(e.target.value);
              }}
              style={{
                width: '100%',
                padding: 10,
                border: '1px solid var(--border)',
                borderRadius: 10,
                background: '#fff',
              }}
              disabled={!roteirosHoje.length || batendo}
            >
              {!roteirosHoje.length && <option value="">Sem atividade atribuída</option>}
              {roteirosHoje.map((r) => (
                <option key={r.id} value={r.id}>
                  {(r.tarefa_nome || 'Tarefa') + ' — ' + statusLabel(r.status || 'planeado')}
                </option>
              ))}
            </select>
          </div>

          {roteiroSelecionado ? (
            <div
              style={{
                marginTop: 2,
                padding: 12,
                border: '1px solid var(--border)',
                borderRadius: 12,
                background: '#fff',
              }}
            >
              <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#0e3258' }}>
                    {roteiroSelecionado.tarefa_nome || 'Tarefa'}
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                    Local: {roteiroSelecionado.local_nome || '—'}
                  </div>
                  {roteiroSelecionado.observacoes ? (
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                      Obs.: {roteiroSelecionado.observacoes}
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
                  {statusLabel(selectedStatus)}
                </span>
              </div>
            </div>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              Nenhuma atividade atribuída para hoje.
            </p>
          )}
        </div>
      </section>

      {/* ✅ Registos de hoje só aparece quando existir atividade ativa */}
      {temAtividadeAtiva && (
        <section
          className="card"
          style={{
            border: '1px solid #E9EEF7',
            borderRadius: 16,
            padding: 16,
            background: '#fff',
            boxShadow: '0 1px 0 rgba(14,50,88,0.06)',
            marginBottom: 12,
            maxWidth: 680,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 900, color: '#0e3258', marginBottom: 10 }}>
            Registos de hoje
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            <StepRow
              title="1) Check-in (atividade)"
              desc=""
              done={jornada.checkin || regras.st === 'em_andamento' || regras.st === 'executado'}
              actionLabel="Fazer check-in"
              actionKind="primary"
              disabled={!regras.podeCheckin || batendo}
              onClick={() => iniciarAcao('entrada')}
            />

            <StepRow
              title="2) Saída almoço (do dia)"
              desc={jornada.checkinAny ? '' : 'Precisa existir pelo menos 1 check-in hoje.'}
              done={jornada.almocoOut}
              actionLabel="Registar saída almoço"
              actionKind="ghost"
              disabled={!regras.podeAlmocoOut || batendo}
              onClick={() => iniciarAcao('saida_almoco')}
            />

            <StepRow
              title="3) Retorno almoço (do dia)"
              desc={
                jornada.almocoOutAt
                  ? `Tempo desde a saída: ${msToMin(Date.now() - new Date(jornada.almocoOutAt).getTime())} min`
                  : ''
              }
              done={jornada.almocoIn}
              actionLabel="Registar retorno almoço"
              actionKind="ghost"
              disabled={!regras.podeAlmocoIn || batendo}
              onClick={() => iniciarAcao('retorno_almoco')}
            />

            <StepRow
              title="4) Check-out (atividade)"
              desc={regras.bloqueioCheckoutPorAlmoco ? 'Precisa registar o retorno do almoço antes do check-out.' : ''}
              done={jornada.checkout || regras.st === 'executado'}
              actionLabel="Fazer check-out"
              actionKind="accent"
              disabled={!regras.podeCheckout || batendo}
              onClick={() => iniciarAcao('saida')}
            />
          </div>

          {gettingGeo && <p className="muted" style={{ marginTop: 10 }}>A obter localização do dispositivo…</p>}
          {err && <p style={{ color: 'crimson', marginTop: 10 }}>{err}</p>}
          {msg && <p style={{ color: 'green', marginTop: 10 }}>{msg}</p>}

          <p className="muted" style={{ fontSize: 12, marginTop: 10, marginBottom: 0 }}>
            A validação de localização é aplicada conforme o local configurado na atividade (check-in/check-out).
          </p>
        </section>
      )}

      {/* ✅ Confirmação do retorno do almoço (quando fora de 60-65) */}
      {mostrarConfirmacaoRetornoAlmoco && (
        <section className="card" style={{ marginBottom: 16, maxWidth: 680 }}>
          <h2 className="h2" style={{ marginBottom: 12 }}>
            Confirmar retorno do almoço
          </h2>

          <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
            O retorno do almoço deve ocorrer entre <strong>60</strong> e <strong>65</strong> minutos.
          </p>

          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: '#0e3258' }}>
              Tempo atual: {retornoAlmocoMin ?? '—'} min
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              {retornoAlmocoExigeJust
                ? 'Fora do intervalo. Justificativa obrigatória.'
                : 'Dentro do intervalo.'}
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label className="muted">Justificativa</label>
            <textarea
              value={almocoJustificativa}
              onChange={(e) => setAlmocoJustificativa(e.target.value)}
              rows={3}
              placeholder="Explique o motivo do almoço fora do intervalo (obrigatório)."
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 10,
                border: '1px solid var(--border)',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              className="btn btn-ghost"
              disabled={batendo}
              onClick={() => {
                resetAcaoUI();
              }}
            >
              Cancelar
            </button>

            <button
              className="btn btn-primary"
              disabled={batendo || !almocoJustificativa.trim()}
              onClick={async () => {
                await baterPonto('retorno_almoco', null);
              }}
            >
              {batendo ? 'A registar…' : 'Confirmar retorno'}
            </button>
          </div>
        </section>
      )}

      {/* Confirmação do check-out */}
      {mostrarConfirmacaoCheckout && (
        <section className="card" style={{ marginBottom: 16, maxWidth: 680 }}>
          <h2 className="h2" style={{ marginBottom: 12 }}>
            Confirmar registo
          </h2>

          <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
            Para <strong>Check-in</strong> o registo é automático após confirmar a foto.
            Para <strong>Check-out</strong>, confirme a conclusão da tarefa.
          </p>

          {photoPreview && (
            <div style={{ marginTop: 10 }}>
              <img
                src={photoPreview}
                alt="Pré-visualização"
                style={{
                  maxWidth: '100%',
                  maxHeight: 260,
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                }}
              />
            </div>
          )}

          {acaoTipo === 'saida' && !jornada.checkout && (
            <>
              <div style={{ marginTop: 12 }}>
                <label className="muted">Conclusão da tarefa</label>

                <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                  <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13 }}>
                    <input
                      type="radio"
                      name="tarefaConcluida"
                      checked={tarefaConcluida === true}
                      onChange={() => setTarefaConcluida(true)}
                    />
                    <span>Concluí a tarefa atribuída.</span>
                  </label>

                  <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13 }}>
                    <input
                      type="radio"
                      name="tarefaConcluida"
                      checked={tarefaConcluida === false}
                      onChange={() => setTarefaConcluida(false)}
                    />
                    <span>Não concluí a tarefa (exige justificativa).</span>
                  </label>
                </div>
              </div>

              {tarefaConcluida === false && (
                <div style={{ marginTop: 12 }}>
                  <label className="muted">Justificativa</label>
                  <textarea
                    value={justificativa}
                    onChange={(e) => setJustificativa(e.target.value)}
                    rows={3}
                    placeholder="Descreva o motivo."
                    style={{
                      width: '100%',
                      padding: 10,
                      borderRadius: 10,
                      border: '1px solid var(--border)',
                      resize: 'vertical',
                    }}
                  />
                </div>
              )}

              <button
                className="btn btn-primary"
                style={{ marginTop: 12 }}
                disabled={
                  batendo ||
                  !pendingFotoFile ||
                  tarefaConcluida === null ||
                  (tarefaConcluida === false && !justificativa.trim())
                }
                onClick={async () => {
                  if (!pendingFotoFile) return;
                  await baterPonto('saida', pendingFotoFile);
                }}
              >
                {batendo ? 'A registar…' : 'Confirmar check-out'}
              </button>
            </>
          )}
        </section>
      )}

      {/* Outras atividades */}
      {!!outrasAtividades.length && (
        <section className="card" style={{ marginBottom: 16 }}>
          <h2 className="h2" style={{ marginBottom: 8 }}>
            Outras atividades de hoje
          </h2>
          <p className="muted" style={{ marginTop: 0, marginBottom: 12 }}>
            Apenas para consulta. A jornada é controlada acima pela atividade selecionada.
          </p>

          <div style={{ display: 'grid', gap: 10 }}>
