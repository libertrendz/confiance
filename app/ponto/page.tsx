'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

type PontoRow = {
  id: string;
  empresa_id: string;
  usuario_id: string;
  tipo: string;
  meta: any;
  batida_at: string;
  created_at: string;
};

type LocalPermitido = {
  id: string;
  empresa_id: string;
  nome?: string | null;
  lat?: number | null;
  lon?: number | null;
  raio_m?: number | null;
};

type GeoState = {
  lat: number | null;
  lon: number | null;
  accuracy: number | null;
};

type TipoPonto =
  | 'entrada'
  | 'saida_almoco'
  | 'retorno_almoco'
  | 'saida'
  | 'in'
  | 'out';

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
        if (!authData?.user) {
          throw new Error('Sessão expirada. Faça login novamente.');
        }

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
        if (!profile) {
          throw new Error('Perfil não encontrado. Contacte o administrador.');
        }

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

  // 2) locais permitidos
  useEffect(() => {
    if (!empresaId) return;
    let alive = true;

    (async () => {
      try {
        setLoadingLocais(true);
        const { data, error } = await supa
          .from('locais_permitidos')
          .select('id, empresa_id, nome, lat, lon, raio_m')
          .eq('empresa_id', empresaId);

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
        .order('batida_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      const rows = (data || []) as PontoRow[];
      setUltimos(rows);

      const last = rows[0]?.tipo ?? null;
      const allowed = nextAllowedTipos(last);
      if (allowed.length) {
        setTipo(allowed[0]);
      }
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
      // Não explode a UI, mas deixa visível pelo comportamento do checkout
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
    // ao mudar tipo, reseta confirmação
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
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
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
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // 7) validação de raio
  function validarRaio(g: GeoState) {
    if (!g.lat || !g.lon) return { ok: true, motivo: 'Sem geo' };

    if (!locais.length) {
      return {
        ok: true,
        motivo: 'Sem locais configurados; ponto registado sem validação de raio.',
      };
    }

    let melhor: { local: LocalPermitido | null; distancia: number } = {
      local: null,
      distancia: Infinity,
    };

    locais.forEach((loc) => {
      if (loc.lat == null || loc.lon == null || loc.raio_m == null) return;
      const d = distanceMeters(g.lat!, g.lon!, Number(loc.lat), Number(loc.lon));
      if (d < melhor.distancia) {
        melhor = { local: loc, distancia: d };
      }
    });

    if (!melhor.local) {
      return {
        ok: true,
        motivo: 'Locais configurados sem lat/lon; ponto registado sem validação de raio.',
      };
    }

    const raio = Number(melhor.local.raio_m || 0);
    if (raio > 0 && melhor.distancia > raio) {
      return {
        ok: false,
        motivo: `Fora da zona permitida. Distância ~${melhor.distancia.toFixed(
          1
        )}m (raio permitido ${raio}m).`,
      };
    }

    return {
      ok: true,
      motivo: `Dentro da zona permitida. Distância ~${melhor.distancia.toFixed(
        1
      )}m (raio ${raio}m).`,
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

  // 8) fluxo central de bater ponto
  async function baterPonto() {
    if (!usuarioId || !empresaId) return;
    setBatendo(true);
    setErr(null);
    setMsg(null);

    try {
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

      const meta: Record<string, any> = {
        origem: 'externo-web',
        device: 'browser',
        lat: g.lat,
        lon: g.lon,
        accuracy: g.accuracy,
        raio_validacao: raioCheck.motivo,
      };

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

      // *** Regra: na SAÍDA a tarefa vem do roteiro e é fixa ***
      if (tipo === 'saida') {
        if (!roteiroHoje?.tarefa_id) {
          setErr('Não existe roteiro/tarefa atribuída para hoje. Contacte o administrador/gestor.');
          return;
        }

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

      const { error } = await supa.rpc('rpc_ponto_bater', {
        p_empresa_id: empresaId,
        p_usuario_id: usuarioId,
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
      tipo === 'entrada' ||
      tipo === 'saida' ||
      tipo === 'saida_almoco' ||
      tipo === 'retorno_almoco';

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

    await baterPonto();
  }

  // UI

  if (loadingUser) {
    return (
      <main style={{ padding: 18 }}>
        <p className="muted">A carregar dados do utilizador…</p>
      </main>
    );
  }

  if (err && !usuarioId) {
    return (
      <main style={{ padding: 18 }}>
        <p style={{ color: 'crimson', marginBottom: 8 }}>{err}</p>
        <p className="muted">Tente sair e entrar novamente.</p>
      </main>
    );
  }

  const ultimoTipo = ultimos[0]?.tipo ?? null;
  const allowedTipos = nextAllowedTipos(ultimoTipo);

  return (
    <main
      style={{
        padding: 16,
        fontFamily: 'system-ui',
        maxWidth: 1100,
        margin: '0 auto',
      }}
    >
      {/* HEADER NO PADRÃO DO HISTÓRICO (logo + voltar + título + subtítulo) */}
      <header style={{ marginBottom: 12 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 8,
          }}
        >
          <img
            src="https://cfremxfgqehqnbqummti.supabase.co/storage/v1/object/public/images/app-novo.png"
            alt="CONFIANCE"
            style={{ height: 28, width: 'auto', display: 'block' }}
          />

          <a
            href="/menu"
            style={{
              marginLeft: 'auto',
              fontSize: 12,
              textDecoration: 'none',
              color: '#0e3258',
              fontWeight: 700,
            }}
          >
            ← Voltar
          </a>
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 800,
            color: '#0e3258',
          }}
        >
          Marcar Ponto
        </h1>

        <p
          style={{
            margin: '4px 0 0 0',
            fontSize: 13,
            color: '#49546A',
          }}
        >
          {nome ? (
            <>
              Olá, <strong>{nome}</strong>. Utilize esta página para registar a sua jornada.
            </>
          ) : (
            'Utilize esta página para registar a sua jornada.'
          )}
        </p>
      </header>

      <div className="card" style={{ marginBottom: 16 }}>
        {loadingLocais ? (
          <p className="muted">A carregar locais permitidos…</p>
        ) : locais.length ? (
          <p className="muted">
            Locais configurados para esta empresa: {locais.length}. A localização será validada num
            raio definido pelo administrador.
          </p>
        ) : (
          <p className="muted">
            Ainda não existem locais de trabalho configurados. O ponto será registado sem validação
            de raio até configuração pelo administrador.
          </p>
        )}
      </div>

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
                Último registo: <strong>{labelTipo(ultimoTipo)}</strong>. Sequência é sempre:{' '}
                Entrada → Saída almoço → Retorno almoço → Saída.
              </p>
            )}
            {!ultimoTipo && (
              <p className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                Primeiro registo do dia: <strong>Entrada</strong>.
              </p>
            )}
          </div>

          {/* Tarefa FIXA (obrigatória na SAÍDA) */}
          {tipo === 'saida' && (
            <div>
              <label className="muted">Tarefa atribuída (obrigatória na saída)</label>

              {loadingRoteiro && (
                <p className="muted" style={{ fontSize: 12 }}>
                  A carregar roteiro do dia…
                </p>
              )}

              {!loadingRoteiro && !roteiroHoje && (
                <p style={{ color: 'crimson', fontSize: 12, marginTop: 6 }}>
                  Não existe tarefa atribuída para hoje. Contacte o administrador/gestor para criar
                  um roteiro.
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

          {(tipo === 'entrada' ||
            tipo === 'saida' ||
            tipo === 'saida_almoco' ||
            tipo === 'retorno_almoco') && (
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

          {/* Justificativa – opcional (vira obrigatória no checkout quando não concluir) */}
          <div>
            <label className="muted">Justificativa (opcional)</label>
            <textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              rows={3}
              placeholder="Descreva o motivo caso esteja fora do horário normal, fora do local ou não consiga concluir a tarefa."
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

          {/* BOTÃO ÚNICO, AZUL */}
          <button
            className="btn btn-primary"
            onClick={handleBaterClick}
            disabled={batendo || !usuarioId || !empresaId}
          >
            {batendo ? 'A registar…' : 'Bater ponto agora'}
          </button>
        </div>
      </section>

      {/* TAREFAS DO DIA – placeholder */}
      <section className="card" style={{ marginBottom: 16 }}>
        <h2 className="h2">Tarefas do dia</h2>
        <p className="muted" style={{ marginTop: 4 }}>
          Em versões futuras, esta secção irá listar o roteiro definido pelo administrador (projeto,
          fase/tarefa, local). O ponto de entrada/saída será ligado às tarefas executadas neste
          período.
        </p>
      </section>

      {/* Histórico direcionado para /ponto/historico */}
      <section className="card">
        <h2 className="h2">Histórico completo</h2>
        <p className="muted" style={{ marginTop: 4 }}>
          Para consultar todos os registos de ponto, utilize a opção <strong>Histórico</strong> no
          menu principal.
        </p>
      </section>
    </main>
  );
}
