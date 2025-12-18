// app/ponto/page.tsx

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

type PontoRow = {
  id: string;
  empresa_id: string;
  usuario_id: string;
  tipo: string;
  meta: any;
  batida_at: string | null;
  created_at: string;
};

type LocalPermitido = {
  id: string;
  empresa_id: string;
  nome?: string | null;
  lat?: number | null;
  lng?: number | null;
  radius_m?: number | null;
};

type GeoState = {
  lat: number | null;
  lon: number | null;
  accuracy: number | null;
};

type TipoPonto = 'entrada' | 'saida_almoco' | 'retorno_almoco' | 'saida' | 'in' | 'out';

function labelTipo(t: string | null | undefined): string {
  switch (t) {
    case 'entrada':
      return 'Entrada';
    case 'saida_almoco':
      return 'Saída para almoço';
    case 'retorno_almoco':
      return 'Retorno do almoço';
    case 'saida':
      return 'Saída';
    case 'in':
      return 'In (legacy)';
    case 'out':
      return 'Out (legacy)';
    default:
      return t || '—';
  }
}

function nextAllowedTipos(last: string | null): TipoPonto[] {
  switch (last) {
    case null:
    case undefined:
    case 'saida':
      return ['entrada'];
    case 'entrada':
      return ['saida_almoco'];
    case 'saida_almoco':
      return ['retorno_almoco'];
    case 'retorno_almoco':
      return ['saida'];
    case 'in':
    case 'out':
    default:
      return ['entrada'];
  }
}

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

export default function PontoPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [nome, setNome] = useState<string | null>(null);

  const [tipo, setTipo] = useState<TipoPonto>('entrada');
  const [loadingUser, setLoadingUser] = useState(true);
  const [batendo, setBatendo] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [ultimos, setUltimos] = useState<PontoRow[]>([]);
  const [loadingLista, setLoadingLista] = useState(false);

  const [locais, setLocais] = useState<LocalPermitido[]>([]);
  const [loadingLocais, setLoadingLocais] = useState(false);

  // Roteiro do dia (tarefa fixa)
  const [roteiroHoje, setRoteiroHoje] = useState<{
    tarefa_id: string;
    tarefa_nome: string;
    local_id: string | null;
    local_nome: string | null;
  } | null>(null);
  const [loadingRoteiro, setLoadingRoteiro] = useState(false);
  const [tarefaConcluida, setTarefaConcluida] = useState(false);

  const [geo, setGeo] = useState<GeoState>({
    lat: null,
    lon: null,
    accuracy: null,
  });
  const [gettingGeo, setGettingGeo] = useState(false);

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [justificativa, setJustificativa] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function isDiaFinalizado(): boolean {
    const hojeStr = todayLocalStr();
    const lastCreatedDay = ultimos[0]?.created_at ? localDateStrFromIso(ultimos[0].created_at) : null;
    return lastCreatedDay === hojeStr && ultimos[0]?.tipo === 'saida';
  }

  // Upload da foto para o bucket "ponto-fotos" e retorna info auditável
  async function uploadFoto(file: File, tipoAtual: string) {
    if (!empresaId || !usuarioId) throw new Error('Sessão inválida para upload.');

    const ext =
      file.type === 'image/png'
        ? 'png'
        : file.type === 'image/webp'
        ? 'webp'
        : 'jpg';

    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const dia = new Date().toISOString().slice(0, 10);

    const path = `${empresaId}/${usuarioId}/${dia}/${tipoAtual}-${ts}.${ext}`;

    const { error: upErr } = await supa.storage.from('ponto-fotos').upload(path, file, {
      upsert: false,
      contentType: file.type || 'image/jpeg',
    });

    if (upErr) throw upErr;

    const { data: pub } = supa.storage.from('ponto-fotos').getPublicUrl(path);

    return {
      bucket: 'ponto-fotos',
      path,
      publicUrl: pub?.publicUrl || null,
    };
  }

  // 1) user + empresa via auth + profiles
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

  // 2) locais permitidos (ATENÇÃO: colunas do DB são lat/lng/radius_m)
  useEffect(() => {
    if (!empresaId) return;
    let alive = true;

    (async () => {
      try {
        setLoadingLocais(true);
        const { data, error } = await supa
          .from('locais_permitidos')
          .select('id, empresa_id, nome, lat, lng, radius_m')
          .eq('empresa_id', empresaId)
          .eq('ativo', true);

        if (error) throw error;
        if (!alive) return;

        setLocais((data || []) as LocalPermitido[]);
      } catch (e) {
        console.error('Erro ao carregar locais_permitidos', e);
      } finally {
        if (alive) setLoadingLocais(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [empresaId, supa]);

  // 3) últimos pontos do próprio user (para saber o último tipo)
  async function carregarUltimos() {
    if (!usuarioId || !empresaId) return;
    setLoadingLista(true);
    try {
      const { data, error } = await supa
        .from('ponto_registro')
        .select('*')
        .eq('usuario_id', usuarioId)
        .eq('empresa_id', empresaId)
        // IMPORTANTE: ordena por created_at para não “sumir” registo quando batida_at vem null
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      const rows = (data || []) as PontoRow[];
      setUltimos(rows);

      const last = rows[0]?.tipo ?? null;
      const allowed = nextAllowedTipos(last);
      if (allowed.length) setTipo(allowed[0]);
    } catch (e: any) {
      console.error('Erro ao carregar últimos pontos', e);
    } finally {
      setLoadingLista(false);
    }
  }

  // 4) carregar roteiro do dia (tarefa fixa) para o utilizador
  async function carregarRoteiroHoje() {
    if (!usuarioId || !empresaId) return;

    setLoadingRoteiro(true);
    try {
      const hoje = new Date();
      const yyyy = hoje.getFullYear();
      const mm = String(hoje.getMonth() + 1).padStart(2, '0');
      const dd = String(hoje.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;

      const { data, error } = await supa
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

      if (error) throw error;

      if (data?.tarefa_id) {
        setRoteiroHoje({
          tarefa_id: (data as any).tarefa_id,
          tarefa_nome: (data as any).tarefas_padrao?.nome || '—',
          local_id: (data as any).local_id ?? null,
          local_nome: (data as any).locais_permitidos?.nome ?? null,
        });
      } else {
        setRoteiroHoje(null);
      }

      setTarefaConcluida(false);
    } catch (e: any) {
      console.error('Erro ao carregar roteiro do dia', e);
      setRoteiroHoje(null);
    } finally {
      setLoadingRoteiro(false);
    }
  }

  useEffect(() => {
    if (usuarioId && empresaId) {
      carregarUltimos();
      carregarRoteiroHoje();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioId, empresaId]);

  useEffect(() => {
    setTarefaConcluida(false);
  }, [tipo]);

  // 5) geolocalização
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

  // 6) distância (haversine)
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

  // 7) validação de raio (usa lat/lng/radius_m do DB)
  function validarRaio(g: GeoState) {
    if (g.lat == null || g.lon == null) return { ok: true, motivo: 'Sem geo' };

    if (!locais.length) {
      return { ok: true, motivo: 'Sem locais configurados; ponto registado sem validação de raio.' };
    }

    let melhor: { local: LocalPermitido | null; distancia: number } = {
      local: null,
      distancia: Infinity,
    };

    locais.forEach((loc) => {
      if (loc.lat == null || loc.lng == null) return;
      const d = distanceMeters(g.lat as number, g.lon as number, Number(loc.lat), Number(loc.lng));
      if (d < melhor.distancia) melhor = { local: loc, distancia: d };
    });

    if (!melhor.local) {
      return { ok: true, motivo: 'Locais configurados sem lat/lng; ponto registado sem validação de raio.' };
    }

    const raio = Number(melhor.local.radius_m ?? 0);

    if (raio > 0 && melhor.distancia > raio) {
      return {
        ok: false,
        motivo: `Fora da zona permitida. Distância ~${melhor.distancia.toFixed(1)}m (raio permitido ${raio}m).`,
      };
    }

    return {
      ok: true,
      motivo: `Dentro da zona permitida. Distância ~${melhor.distancia.toFixed(1)}m (raio ${raio}m).`,
      localId: melhor.local.id,
      distancia: melhor.distancia,
    };
  }

  function validarSequencia(tipoAtual: TipoPonto): { ok: boolean; msg?: string } {
    const last = ultimos[0]?.tipo ?? null;
    const allowed = nextAllowedTipos(last);
    if (!allowed.includes(tipoAtual)) {
      const prox = allowed.map(labelTipo).join(' / ');
      const lastLabel = labelTipo(last);
      return {
        ok: false,
        msg: `Sequência de ponto inválida. Último registo: ${lastLabel}. Próximo permitido: ${prox}.`,
      };
    }
    return { ok: true };
  }

  // 8) fluxo central de bater ponto (agora aceita foto)
  async function baterPonto(photoFile?: File | null) {
    if (!usuarioId || !empresaId) return;
    setBatendo(true);
    setErr(null);
    setMsg(null);

    try {
      if (isDiaFinalizado()) {
        setErr('Dia já finalizado. Aguarde a próxima tarefa.');
        return;
      }

      const seq = validarSequencia(tipo);
      if (!seq.ok) {
        setErr(seq.msg || 'Sequência de ponto inválida.');
        return;
      }

      const g = await obterGeo();
      if (!g) return;

      const raioCheck = validarRaio(g);
      if (!raioCheck.ok) {
        setErr(
          `Não foi possível registar ponto: ${raioCheck.motivo} ` +
            'Fale com o responsável ou verifique se está no local correto.'
        );
        return;
      }

      const exigeFoto =
        tipo === 'entrada' || tipo === 'saida' || tipo === 'saida_almoco' || tipo === 'retorno_almoco';

      let fotoInfo: { bucket: string; path: string; publicUrl: string | null } | null = null;

      if (exigeFoto) {
        if (!photoFile) {
          setErr('Foto obrigatória. Abra a câmara e tire a foto para continuar.');
          return;
        }
        fotoInfo = await uploadFoto(photoFile, tipo);
      }

      const meta: Record<string, any> = {
        origem: 'externo-web',
        device: 'browser',
        lat: g.lat,
        lon: g.lon,
        accuracy: g.accuracy,
        raio_validacao: raioCheck.motivo,
      };

      if (fotoInfo) {
        meta.foto_bucket = fotoInfo.bucket;
        meta.foto_path = fotoInfo.path;
        meta.foto_url = fotoInfo.publicUrl; // se bucket for público
        meta.foto_capturada = true; // compat p/ auditoria
      }

      if (raioCheck.localId) {
        meta.local_id = raioCheck.localId;
        meta.dist_m = raioCheck.distancia;
      }

      if (tipo === 'entrada') meta.foto_checkin = true;
      if (tipo === 'saida') meta.foto_checkout = true;
      if (tipo === 'saida_almoco') meta.foto_saida_almoco = true;
      if (tipo === 'retorno_almoco') meta.foto_retorno_almoco = true;

      const just = justificativa.trim();
      if (just) meta.justificativa = just;

      // *** Regra: na SAÍDA a tarefa vem do roteiro (ou contingência) ***
      if (tipo === 'saida') {
        // Contingência: permite saída sem roteiro, mas exige justificativa
        if (!roteiroHoje?.tarefa_id) {
          if (!just) {
            setErr('Sem roteiro atribuído para hoje. Para finalizar, informe uma justificativa.');
            return;
          }

          meta.contingencia = true;
          meta.motivo_contingencia = 'sem_roteiro';
          meta.tarefa_concluida = null;
        } else {
          // Fluxo normal com roteiro fixo + confirmação
          if (!tarefaConcluida) {
            if (!just) {
              setErr('Para finalizar sem concluir a tarefa, é obrigatória uma justificativa.');
              return;
            }
            meta.tarefa_concluida = false;
          } else {
            meta.tarefa_concluida = true;
          }

          meta.tarefa_id = roteiroHoje.tarefa_id;
          meta.tarefa_nome = roteiroHoje.tarefa_nome;

          if (roteiroHoje.local_id) meta.roteiro_local_id = roteiroHoje.local_id;
          if (roteiroHoje.local_nome) meta.roteiro_local_nome = roteiroHoje.local_nome;
        }
      }

      // ✅ chama RPC sem passar usuario/empresa (evita RLS quebrar no mobile)
      const { error } = await supa.rpc('rpc_ponto_bater', {
        p_tipo: tipo,
        p_meta: meta,
      });

      if (error) throw error;

      setMsg('Ponto registado com sucesso.');
      setPhotoPreview(null);
      setJustificativa('');
      setTarefaConcluida(false);

      await carregarUltimos();
      await carregarRoteiroHoje();
    } catch (e: any) {
      console.error('Erro ao bater ponto', e);
      setErr(e?.message || 'Falha ao registar ponto.');
    } finally {
      setBatendo(false);
    }
  }

  // 9) handler do botão único
  async function handleBaterClick() {
    setErr(null);
    setMsg(null);

    const exigeFoto =
      tipo === 'entrada' || tipo === 'saida' || tipo === 'saida_almoco' || tipo === 'retorno_almoco';

    if (exigeFoto) {
      if (fileInputRef.current) fileInputRef.current.click();
      return;
    }

    await baterPonto();
  }

  // 10) onChange do input de foto
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

    await baterPonto(file);
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

  const ultimoTipo = ultimos[0]?.tipo ?? null;
  const allowedTipos = nextAllowedTipos(ultimoTipo);

  const hojeStr = todayLocalStr();
  const lastCreatedDay = ultimos[0]?.created_at ? localDateStrFromIso(ultimos[0].created_at) : null;
  const diaFinalizado = lastCreatedDay === hojeStr && ultimos[0]?.tipo === 'saida';

  return (
    <main
      style={{
        padding: 16,
        fontFamily: 'system-ui',
        maxWidth: 1100,
        margin: '0 auto',
      }}
    >
      {/* HEADER (padrão do histórico) + logo + botão */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 12,
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
            Confiance
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 900,
              color: '#0e3258',
              lineHeight: 1.1,
            }}
          >
            Marcar ponto
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

      {/* Subheader (mensagem clara) */}
      <header style={{ marginBottom: 12 }}>
        <p
          style={{
            margin: '4px 0 0 0',
            fontSize: 13,
            color: '#49546A',
          }}
        >
          {nome
            ? `Olá, ${nome}. Registe aqui a sua entrada/saídas com foto e localização.`
            : 'Registe aqui a sua entrada/saídas com foto e localização.'}
        </p>
      </header>

      {/* Status: validação de local */}
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
        <div style={{ fontSize: 13, fontWeight: 800, color: '#0e3258', marginBottom: 6 }}>
          Validação de local
        </div>

        {loadingLocais ? (
          <p className="muted">A carregar configuração de locais…</p>
        ) : locais.length ? (
          <p className="muted">
            Ativa. Existem {locais.length} local(is) configurado(s) e o ponto é validado por raio.
          </p>
        ) : (
          <p className="muted">
            Desativada. Ainda não existem locais configurados; o ponto será registado sem validação
            de raio.
          </p>
        )}
      </section>

      {/* Roteiro do dia */}
      <section
        className="card"
        style={{
          border: '1px solid #E9EEF7',
          borderRadius: 16,
          padding: 16,
          background: '#fff',
          boxShadow: '0 1px 0 rgba(14,50,88,0.06)',
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 800, color: '#0e3258', marginBottom: 6 }}>
          Roteiro de hoje
        </div>

        {diaFinalizado ? (
          <div style={{ fontSize: 13, color: '#3F4A5F' }}>
            <p className="muted" style={{ margin: 0 }}>
              <strong>Tarefa finalizada.</strong> Aguarde a próxima tarefa.
            </p>
          </div>
        ) : loadingRoteiro ? (
          <p className="muted">A carregar roteiro do dia…</p>
        ) : roteiroHoje ? (
          <div style={{ fontSize: 13, color: '#3F4A5F' }}>
            <div>
              <strong>Tarefa:</strong> {roteiroHoje.tarefa_nome}
            </div>
            <div style={{ marginTop: 4 }}>
              <strong>Local:</strong> {roteiroHoje.local_nome || '—'}
            </div>
            <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
              Na <strong>Saída</strong>, esta tarefa fica fixa e você confirma a conclusão.
            </p>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: '#3F4A5F' }}>
            <p className="muted" style={{ margin: 0 }}>
              Ainda não existe roteiro atribuído para hoje.
            </p>
            <p className="muted" style={{ marginTop: 6, fontSize: 12 }}>
              Se precisar finalizar o dia mesmo assim, a <strong>Saída</strong> funcionará em modo{' '}
              <strong>contingência</strong> com justificativa obrigatória.
            </p>
          </div>
        )}
      </section>

      {/* FORM PRINCIPAL */}
      <section className="card" style={{ marginBottom: 16, maxWidth: 520 }}>
        <h2 className="h2" style={{ marginBottom: 12 }}>
          Bater ponto
        </h2>

        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label className="muted">Próximo tipo de registo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoPonto)}
              style={{
                width: '100%',
                padding: 10,
                border: '1px solid var(--border)',
                borderRadius: 10,
                background: '#fff',
              }}
            >
              {allowedTipos.map((t) => (
                <option key={t} value={t}>
                  {labelTipo(t)}
                </option>
              ))}
            </select>

            {ultimoTipo && (
              <p className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                Último registo: <strong>{labelTipo(ultimoTipo)}</strong>. Sequência: Entrada → Saída
                almoço → Retorno almoço → Saída.
              </p>
            )}
            {!ultimoTipo && (
              <p className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                Primeiro registo do dia: <strong>Entrada</strong>.
              </p>
            )}
          </div>

          {/* Tarefa FIXA (obrigatória na SAÍDA quando existe roteiro) */}
          {tipo === 'saida' && (
            <div>
              <label className="muted">Encerramento do dia</label>

              {loadingRoteiro && (
                <p className="muted" style={{ fontSize: 12 }}>
                  A carregar roteiro do dia…
                </p>
              )}

              {!loadingRoteiro && roteiroHoje && (
                <>
                  <div
                    style={{
                      marginTop: 6,
                      padding: 10,
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      background: '#fff',
                      fontSize: 13,
                    }}
                  >
                    <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>
                      Tarefa atribuída (fixa)
                    </div>
                    <strong>{roteiroHoje.tarefa_nome}</strong>
                    {roteiroHoje.local_nome ? (
                      <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                        Local: {roteiroHoje.local_nome}
                      </div>
                    ) : null}
                  </div>

                  <label
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'center',
                      marginTop: 10,
                      fontSize: 13,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={tarefaConcluida}
                      onChange={(e) => setTarefaConcluida(e.target.checked)}
                    />
                    <span>Confirmo que concluí a tarefa atribuída.</span>
                  </label>

                  {!tarefaConcluida && (
                    <p className="muted" style={{ fontSize: 11, marginTop: 6 }}>
                      Se não concluiu, escreva uma justificativa abaixo (obrigatória quando não
                      concluído).
                    </p>
                  )}
                </>
              )}

              {!loadingRoteiro && !roteiroHoje && (
                <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                  Sem roteiro para hoje. Para finalizar, será exigida justificativa (contingência).
                </p>
              )}
            </div>
          )}

          {/* input de foto escondido */}
          <input
            ref={fileInputRef}
            id="foto-ponto-input"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onPhotoChange}
            style={{ display: 'none' }}
          />

          {(tipo === 'entrada' || tipo === 'saida' || tipo === 'saida_almoco' || tipo === 'retorno_almoco') && (
            <>
              <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                Ao clicar em <strong>Bater ponto agora</strong>, a câmara será aberta. Tire a foto
                no local (sem usar galeria). Após confirmar a foto, o ponto será registado
                automaticamente.
              </p>
              {photoPreview && (
                <div style={{ marginTop: 4 }}>
                  <img
                    src={photoPreview}
                    alt="Pré-visualização"
                    style={{
                      maxWidth: '100%',
                      maxHeight: 240,
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                    }}
                  />
                </div>
              )}
            </>
          )}

          {/* Justificativa */}
          <div>
            <label className="muted">Justificativa (quando necessário)</label>
            <textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              rows={3}
              placeholder="Use quando não concluir a tarefa, estiver fora do local, ou precisar finalizar sem roteiro."
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 10,
                border: '1px solid var(--border)',
                resize: 'vertical',
              }}
            />
          </div>

          {gettingGeo && <p className="muted">A obter localização do dispositivo…</p>}

          {err && <p style={{ color: 'crimson' }}>{err}</p>}
          {msg && <p style={{ color: 'green' }}>{msg}</p>}

          <button
            className="btn btn-primary"
            onClick={handleBaterClick}
            disabled={batendo || !usuarioId || !empresaId || diaFinalizado}
          >
            {batendo ? 'A registar…' : 'Bater ponto agora'}
          </button>

          <a
            href="/ponto/historico"
            className="btn btn-ghost"
            style={{
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

          {loadingLista && <p className="muted">A atualizar estado do dia…</p>}
        </div>
      </section>
    </main>
  );
}
