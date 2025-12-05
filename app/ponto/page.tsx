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

type TarefaRow = {
  id: string;
  empresa_id: string;
  nome: string;
  ativo: boolean;
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

  const [tarefas, setTarefas] = useState<TarefaRow[]>([]);
  const [loadingTarefas, setLoadingTarefas] = useState(false);
  const [tarefaId, setTarefaId] = useState<string>('');

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

  // 3) tarefas padrão da empresa
  useEffect(() => {
    if (!empresaId) return;
    let alive = true;

    (async () => {
      try {
        setLoadingTarefas(true);
        const { data, error } = await supa
          .from('tarefas_padrao')
          .select('id, empresa_id, nome, ativo')
          .eq('empresa_id', empresaId)
          .eq('ativo', true)
          .order('nome', { ascending: true });

        if (error) throw error;
        if (!alive) return;

        const lista = (data || []) as TarefaRow[];
        setTarefas(lista);
        if (lista.length && !tarefaId) {
          setTarefaId(lista[0].id);
        }
      } catch (e) {
        console.error('Erro ao carregar tarefas_padrao', e);
      } finally {
        if (alive) setLoadingTarefas(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [empresaId, supa]);

  // 4) últimos pontos do próprio user (para saber o último tipo)
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

  useEffect(() => {
    if (usuarioId && empresaId) {
      carregarUltimos();
    }
  }, [usuarioId, empresaId]);

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
          let msg = 'Não foi possível obter a localização.';
          if (error.code === error.PERMISSION_DENIED) {
            msg =
              'Permissão de localização negada. Ative a localização para poder marcar ponto.';
          }
          setErr(msg);
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

    let melhor: {
      local: LocalPermitido | null;
      distancia: number;
    } = { local: null, distancia: Infinity };

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
      if (!g) {
        return;
      }

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

      if (tipo === 'entrada') {
        meta.foto_checkin = true;
      }
      if (tipo === 'saida') {
        meta.foto_checkout = true;
      }
      if (tipo === 'saida_almoco') {
        meta.foto_saida_almoco = true;
      }
      if (tipo === 'retorno_almoco') {
        meta.foto_retorno_almoco = true;
      }

      const just = justificativa.trim();
      if (just) {
        meta.justificativa = just;
      }

      // *** Regra: na SAÍDA é obrigatório selecionar tarefa executada ***
      if (tipo === 'saida') {
        if (!tarefas.length) {
          setErr(
            'Nenhuma tarefa configurada para esta empresa. Peça ao administrador/gestor para configurar tarefas padrão antes de concluir o dia.'
          );
          return;
        }
        if (!tarefaId) {
          setErr('Selecione a tarefa executada para concluir o dia.');
          return;
        }
        const tarefa = tarefas.find((t) => t.id === tarefaId);
        meta.tarefa_id = tarefaId;
        meta.tarefa_nome = tarefa?.nome || null;
      }

      const { data, error } = await supa.rpc('rpc_ponto_bater', {
        p_empresa_id: empresaId,
        p_usuario_id: usuarioId,
        p_tipo: tipo,
        p_meta: meta,
      });

      if (error) throw error;

      setMsg('Ponto registado com sucesso.');
      setPhotoPreview(null);
      setJustificativa('');
      await carregarUltimos();
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
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
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
    <main style={{ padding: 18 }}>
      {/* LOGO CONFIANCE */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
        }}
      >
        <img
          src="https://cfremxfgqehqnbqummti.supabase.co/storage/v1/object/public/images/app-novo.png"
          alt="CONFIANCE"
          style={{ height: 28 }}
        />
        <span
          style={{
            fontSize: 11,
            textTransform: 'uppercase',
            color: '#6b7280',
          }}
        >
          Ponto
        </span>
      </header>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="h1" style={{ marginBottom: 4 }}>Marcar Ponto</div>
        {nome && (
          <p className="muted" style={{ marginBottom: 8 }}>
            Olá, <strong>{nome}</strong>. Utilize esta página para registar a sua jornada.
          </p>
        )}
        {loadingLocais ? (
          <p className="muted">A carregar locais permitidos…</p>
        ) : locais.length ? (
          <p className="muted">
            Locais configurados para esta empresa: {locais.length}. A localização será validada
            num raio definido pelo administrador.
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
        <h2 className="h2" style={{ marginBottom: 12 }}>Bater ponto</h2>

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

          {/* Tarefa (obrigatória na SAÍDA) */}
          {tipo === 'saida' && (
            <div>
              <label className="muted">Tarefa executada (obrigatória na saída)</label>
              {loadingTarefas && (
                <p className="muted" style={{ fontSize: 12 }}>
                  A carregar tarefas padrão…
                </p>
              )}
              {!loadingTarefas && !tarefas.length && (
                <p className="muted" style={{ fontSize: 12 }}>
                  Nenhuma tarefa configurada. Contacte o administrador/gestor.
                </p>
              )}
              {!!tarefas.length && (
                <select
                  value={tarefaId}
                  onChange={(e) => setTarefaId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: 10,
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: '#fff',
                    marginTop: 4,
                  }}
                >
                  {tarefas.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome}
                    </option>
                  ))}
                </select>
              )}
              <p className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                Ao concluir o dia, selecione a tarefa principal executada. Se não concluiu, use a
                justificativa abaixo.
              </p>
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

          {/* Justificativa – opcional */}
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

          {gettingGeo && (
            <p className="muted">A obter localização do dispositivo…</p>
          )}

          {err && (
            <p style={{ color: 'crimson' }}>{err}</p>
          )}
          {msg && (
            <p style={{ color: 'green' }}>{msg}</p>
          )}

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
          Em versões futuras, esta secção irá listar o roteiro definido pelo administrador
          (projeto, fase/tarefa, local). O ponto de entrada/saída será ligado às tarefas
          executadas neste período.
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
