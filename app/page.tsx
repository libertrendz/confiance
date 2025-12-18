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

  // progresso / auditoria (colunas do ponto_roteiros)
  foto_bucket: string | null;
  foto_checkin_path: string | null;
  foto_checkout_path: string | null;
  almoco_saida_at: string | null;
  almoco_retorno_at: string | null;
  tarefa_concluida: boolean | null;
  justificativa: string | null;
};

type TipoPonto = 'entrada' | 'saida' | 'saida_almoco' | 'retorno_almoco';

function todayLocalStr() {
  const d = new Date();
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

export default function PontoPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [nome, setNome] = useState<string | null>(null);

  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  const [loadingUser, setLoadingUser] = useState(true);

  const [roteirosHoje, setRoteirosHoje] = useState<RoteiroHojeRow[]>([]);
  const [loadingRoteiros, setLoadingRoteiros] = useState(false);

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

  // ---------- Foto: upload no bucket privado ponto-fotos ----------
  async function uploadFoto(file: File, roteiroId: string, tipoAtual: TipoPonto) {
    if (!empresaId || !usuarioId) throw new Error('Sessão inválida para upload.');

    const ext =
      file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';

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

        foto_bucket: r.foto_bucket ?? null,
        foto_checkin_path: r.foto_checkin_path ?? null,
        foto_checkout_path: r.foto_checkout_path ?? null,
        almoco_saida_at: r.almoco_saida_at ?? null,
        almoco_retorno_at: r.almoco_retorno_at ?? null,
        tarefa_concluida: typeof r.tarefa_concluida === 'boolean' ? r.tarefa_concluida : null,
        justificativa: r.justificativa ?? null,
      }));

      const score = (s: string | null) =>
        s === 'planeado' ? 0 : s === 'em_andamento' ? 1 : s === 'executado' ? 9 : 5;

      mapped.sort((a, b) => score(a.status) - score(b.status));

      setRoteirosHoje(mapped);
    } catch (e: any) {
      console.error('Erro ao carregar roteiros do dia', e);
    } finally {
      setLoadingRoteiros(false);
    }
  }

  useEffect(() => {
    if (usuarioId && empresaId) carregarRoteirosHoje();
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
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
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
  function isDoneAlmocoSaida(r: RoteiroHojeRow) {
    return !!r.almoco_saida_at;
  }
  function isDoneAlmocoRetorno(r: RoteiroHojeRow) {
    return !!r.almoco_retorno_at;
  }
  function isDoneCheckout(r: RoteiroHojeRow) {
    return !!r.foto_checkout_path || r.status === 'executado';
  }

  function canCheckin(r: RoteiroHojeRow) {
    return !isDoneCheckin(r) && (r.status === 'planeado' || !r.status);
  }

  function canAlmocoSaida(r: RoteiroHojeRow) {
    // só depois do check-in e antes do checkout
    if (!isDoneCheckin(r)) return false;
    if (isDoneCheckout(r)) return false;
    return !isDoneAlmocoSaida(r);
  }

  function canAlmocoRetorno(r: RoteiroHojeRow) {
    if (!isDoneCheckin(r)) return false;
    if (isDoneCheckout(r)) return false;
    if (!isDoneAlmocoSaida(r)) return false;
    return !isDoneAlmocoRetorno(r);
  }

  function canCheckout(r: RoteiroHojeRow) {
    if (!isDoneCheckin(r)) return false;
    if (isDoneCheckout(r)) return false;
    // se já saiu pro almoço, exige retorno antes do checkout
    if (isDoneAlmocoSaida(r) && !isDoneAlmocoRetorno(r)) return false;
    return true;
  }

  // ---------- Ações ----------
  async function iniciarAcaoComFoto(roteiro: RoteiroHojeRow, tipo: 'entrada' | 'saida') {
    setErr(null);
    setMsg(null);
    setPhotoPreview(null);
    setRoteiroSelecionado(roteiro);
    setAcaoTipo(tipo);

    // checkout: reset controles
    if (tipo === 'saida') {
      setTarefaConcluida(true);
      setJustificativa('');
    }

    if (fileInputRef.current) fileInputRef.current.click();
  }

  async function executarAcaoSemFoto(roteiro: RoteiroHojeRow, tipo: 'saida_almoco' | 'retorno_almoco') {
    setBatendo(true);
    setErr(null);
    setMsg(null);

    try {
      const g = await obterGeo();
      if (!g) return;

      const raioCheck = validarRaioPorRoteiro(g, roteiro);
      if (!raioCheck.ok) {
        setErr(
          `Não foi possível registar ponto: ${raioCheck.motivo} ` +
            'Fale com o responsável ou verifique se está no local correto.'
        );
        return;
      }

      const meta: Record<string, any> = {
        origem: 'externo-web',
        device: 'browser',
        lat: g.lat,
        lon: g.lon,
        accuracy: g.accuracy,
        raio_validacao: raioCheck.motivo,
        roteiro_id: roteiro.id,
        tarefa_id: roteiro.tarefa_id,
        tarefa_nome: roteiro.tarefa_nome,
        roteiro_local_id: roteiro.local_id,
        roteiro_local_nome: roteiro.local_nome,
      };

      const { error } = await supa.rpc('rpc_ponto_bater', {
        p_tipo: tipo,
        p_roteiro_id: roteiro.id,
        p_meta: meta,
      });

      if (error) throw error;

      setMsg(tipo === 'saida_almoco' ? 'Saída para almoço registada.' : 'Retorno do almoço registado.');
      await carregarRoteirosHoje();
    } catch (e: any) {
      console.error('Erro ao bater ponto (sem foto)', e);
      setErr(e?.message || 'Falha ao registar.');
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

      // checkout: grava conclusão/justificativa
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

      await carregarRoteirosHoje();
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
            Ponto
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

      {/* Lista de roteiros */}
      <section className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <h2 className="h2" style={{ margin: 0 }}>
            Atividades do dia
          </h2>

          <button
            className="btn btn-ghost"
            onClick={carregarRoteirosHoje}
            disabled={loadingRoteiros || batendo}
          >
            {loadingRoteiros ? 'Atualizando…' : 'Atualizar'}
          </button>
        </div>

        {loadingRoteiros && <p className="muted" style={{ marginTop: 10 }}>A carregar atividades…</p>}

        {!loadingRoteiros && !roteirosHoje.length && (
          <p className="muted" style={{ marginTop: 10 }}>
            Nenhuma atividade atribuída para hoje.
          </p>
        )}

        {!!roteirosHoje.length && (
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            {roteirosHoje.map((r) => {
              const st = r.status || 'planeado';

              const okCheckin = isDoneCheckin(r);
              const okAlmocoSaida = isDoneAlmocoSaida(r);
              const okAlmocoRetorno = isDoneAlmocoRetorno(r);
              const okCheckout = isDoneCheckout(r);

              const btnCheckin = canCheckin(r);
              const btnAlmocoSaida = canAlmocoSaida(r);
              const btnAlmocoRetorno = canAlmocoRetorno(r);
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

                  {/* Ações */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                    <button
                      className="btn btn-primary"
                      disabled={!btnCheckin || batendo}
                      onClick={() => iniciarAcaoComFoto(r, 'entrada')}
                    >
                      {batendo && roteiroSelecionado?.id === r.id && acaoTipo === 'entrada' ? 'A registar…' : 'Check-in'}
                    </button>

                    <button
                      className="btn btn-ghost"
                      disabled={!btnAlmocoSaida || batendo}
                      onClick={() => executarAcaoSemFoto(r, 'saida_almoco')}
                      style={{
                        border: '1px solid #D7E3FF',
                        background: '#fff',
                        color: '#0e3258',
                        fontWeight: 700,
                      }}
                    >
                      Saída almoço
                    </button>

                    <button
                      className="btn btn-ghost"
                      disabled={!btnAlmocoRetorno || batendo}
                      onClick={() => executarAcaoSemFoto(r, 'retorno_almoco')}
                      style={{
                        border: '1px solid #D7E3FF',
                        background: '#fff',
                        color: '#0e3258',
                        fontWeight: 700,
                      }}
                    >
                      Retorno almoço
                    </button>

                    <button
                      className="btn btn-ghost"
                      style={{
                        background: '#FFD24D',
                        border: 'none',
                        fontWeight: 900,
                        color: '#0e3258',
                      }}
                      disabled={!btnCheckout || batendo}
                      onClick={() => iniciarAcaoComFoto(r, 'saida')}
                    >
                      {batendo && roteiroSelecionado?.id === r.id && acaoTipo === 'saida' ? 'A registar…' : 'Check-out'}
                    </button>
                  </div>

                  {/* Registos de hoje (somente visual, sem regra/negócio) */}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#0e3258' }}>Registos de hoje</span>
                    </div>

                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <StagePill label="Check-in" ok={okCheckin} />
                      <StagePill label="Saída almoço" ok={okAlmocoSaida} />
                      <StagePill label="Retorno almoço" ok={okAlmocoRetorno} />
                      <StagePill label="Check-out" ok={okCheckout} />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Checkout: confirmação + justificativa (somente quando aplicável) */}
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
              style={{
                maxWidth: '100%',
                maxHeight: 260,
                borderRadius: 10,
                border: '1px solid var(--border)',
              }}
            />
          </div>
        )}

        {/* Só mostra a parte de conclusão quando a ação é checkout */}
        {roteiroSelecionado && acaoTipo === 'saida' && (
          <div style={{ marginTop: 12 }}>
            <label className="muted" style={{ display: 'block', marginBottom: 8 }}>
              Conclusão da tarefa
            </label>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <label style={radioLabelStyle}>
                <input
                  type="radio"
                  name="tarefaConcluida"
                  checked={tarefaConcluida === true}
                  onChange={() => setTarefaConcluida(true)}
                />
                <span>Concluída</span>
              </label>

              <label style={radioLabelStyle}>
                <input
                  type="radio"
                  name="tarefaConcluida"
                  checked={tarefaConcluida === false}
                  onChange={() => setTarefaConcluida(false)}
                />
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
          </div>
        )}

        {gettingGeo && <p className="muted" style={{ marginTop: 10 }}>A obter localização do dispositivo…</p>}
        {err && <p style={{ color: 'crimson', marginTop: 10 }}>{err}</p>}
        {msg && <p style={{ color: 'green', marginTop: 10 }}>{msg}</p>}

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
