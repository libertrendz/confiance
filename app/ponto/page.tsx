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

type TipoPonto = 'entrada' | 'saida';

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
  const [justificativa, setJustificativa] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ---------- Foto: upload no bucket privado ponto-fotos ----------
  async function uploadFoto(file: File, roteiroId: string, tipoAtual: TipoPonto) {
    if (!empresaId || !usuarioId) throw new Error('Sessão inválida para upload.');

    const ext =
      file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';

    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const dia = new Date().toISOString().slice(0, 10);

    // inclui roteiroId no path para facilitar auditoria
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

      // Ordenação “de produto”: pendentes primeiro, depois em andamento, executados por último
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

    // Se o roteiro tem local com lat/lng/raio, valida por ele (mais correto pro negócio)
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

    // Sem coordenadas no local do roteiro: não bloqueia
    return { ok: true, motivo: 'Local do roteiro sem lat/lng; ponto registado sem validação de raio.' };
  }

  // ---------- Ação: Check-in / Check-out ----------
  async function iniciarAcao(roteiro: RoteiroHojeRow, tipo: TipoPonto) {
    setErr(null);
    setMsg(null);
    setPhotoPreview(null);
    setRoteiroSelecionado(roteiro);
    setAcaoTipo(tipo);

    // Foto obrigatória só para entrada e saida (1 e 4 da atividade)
    if (fileInputRef.current) fileInputRef.current.click();
  }

  async function baterPontoComFoto(file: File) {
    if (!roteiroSelecionado) {
      setErr('Selecione um roteiro.');
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

      // upload foto
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

      const just = justificativa.trim();
      if (just) meta.justificativa = just;

      const { error } = await supa.rpc('rpc_ponto_bater', {
        p_tipo: acaoTipo, // 'entrada' | 'saida'
        p_meta: meta,
        p_roteiro_id: roteiroSelecionado.id,
      });

      if (error) throw error;

      setMsg(acaoTipo === 'entrada' ? 'Check-in registado com sucesso.' : 'Check-out registado com sucesso.');
      setJustificativa('');
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
            Roteiros de hoje
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
          {nome ? `Olá, ${nome}. Faça check-in e check-out com foto e localização.` : 'Faça check-in e check-out com foto e localização.'}
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
      <section className="card" style={{ marginBottom: 16 }}>
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

        {loadingRoteiros && <p className="muted" style={{ marginTop: 10 }}>A carregar roteiros…</p>}

        {!loadingRoteiros && !roteirosHoje.length && (
          <p className="muted" style={{ marginTop: 10 }}>
            Nenhuma atividade atribuída para hoje.
          </p>
        )}

        {!!roteirosHoje.length && (
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            {roteirosHoje.map((r) => {
              const st = r.status || 'planeado';
              const podeEntrada = st === 'planeado';
              const podeSaida = st === 'em_andamento';
              const concluido = st === 'executado';

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

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                    <button
                      className="btn btn-primary"
                      disabled={!podeEntrada || batendo}
                      onClick={() => iniciarAcao(r, 'entrada')}
                    >
                      {batendo && roteiroSelecionado?.id === r.id && acaoTipo === 'entrada'
                        ? 'A registar…'
                        : 'Check-in'}
                    </button>

                    <button
                      className="btn btn-ghost"
                      style={{
                        background: '#FFD24D',
                        border: 'none',
                        fontWeight: 700,
                        color: '#0e3258',
                      }}
                      disabled={!podeSaida || batendo}
                      onClick={() => iniciarAcao(r, 'saida')}
                    >
                      {batendo && roteiroSelecionado?.id === r.id && acaoTipo === 'saida'
                        ? 'A registar…'
                        : 'Check-out'}
                    </button>

                    {concluido && (
                      <span className="muted" style={{ fontSize: 12, alignSelf: 'center' }}>
                        Atividade finalizada.
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Preview e justificativa */}
      <section className="card" style={{ marginBottom: 16, maxWidth: 520 }}>
        <h2 className="h2" style={{ marginBottom: 12 }}>
          Confirmar registo
        </h2>

        <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
          Ao clicar em Check-in/Check-out, a câmara será aberta. Após confirmar a foto, o registo é efetuado automaticamente.
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

        <div style={{ marginTop: 12 }}>
          <label className="muted">Justificativa (quando necessário)</label>
          <textarea
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            rows={3}
            placeholder="Use se necessário."
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 10,
              border: '1px solid var(--border)',
              resize: 'vertical',
            }}
          />
        </div>

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
