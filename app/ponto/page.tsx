'use client';

import { useEffect, useMemo, useState } from 'react';
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

export default function PontoPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [nome, setNome] = useState<string | null>(null);

  const [tipo, setTipo] = useState<string>('entrada');
  const [loadingUser, setLoadingUser] = useState(true);
  const [batendo, setBatendo] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [ultimos, setUltimos] = useState<PontoRow[]>([]);
  const [loadingLista, setLoadingLista] = useState(false);

  const [locais, setLocais] = useState<LocalPermitido[]>([]);
  const [loadingLocais, setLoadingLocais] = useState(false);

  const [geo, setGeo] = useState<GeoState>({
    lat: null,
    lon: null,
    accuracy: null,
  });
  const [gettingGeo, setGettingGeo] = useState(false);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // 1) Carregar user + empresa a partir do Supabase auth + profiles
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

  // 2) Carregar locais permitidos para a empresa (se existirem)
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

  // 3) Carregar últimos pontos do colaborador
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
      setUltimos((data || []) as PontoRow[]);
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

  // 4) Capturar geolocalização
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

  // 5) Calcular distância em metros (haversine) entre dois pontos
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

  // 6) Validar raio no cliente (se houver locais_permitidos)
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

  // 7) Captura de foto (input escondido + botão "Tirar foto agora")
  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setPhotoFile(file || null);
    setPhotoPreview(null);

    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const url = typeof reader.result === 'string' ? reader.result : null;
        setPhotoPreview(url);
      };
      reader.readAsDataURL(file);
    }
  }

  // 8) Bater ponto via RPC direto (geo + raio + meta foto)
  async function baterPonto() {
    if (!usuarioId || !empresaId) return;
    setBatendo(true);
    setErr(null);
    setMsg(null);

    try {
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

      const exigeFoto = tipo === 'entrada' || tipo === 'saida';
      if (exigeFoto && !photoFile) {
        setErr(
          'Para registar entrada/saída é necessário tirar uma foto no local com a câmara do dispositivo.'
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

      const { data, error } = await supa.rpc('rpc_ponto_bater', {
        p_empresa_id: empresaId,
        p_usuario_id: usuarioId,
        p_tipo: tipo,
        p_meta: meta,
      });

      if (error) throw error;

      setMsg('Ponto registado com sucesso.');
      setPhotoFile(null);
      setPhotoPreview(null);
      await carregarUltimos();
    } catch (e: any) {
      console.error('Erro ao bater ponto', e);
      setErr(e?.message || 'Falha ao registar ponto.');
    } finally {
      setBatendo(false);
    }
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

  return (
    <main style={{ padding: 18 }}>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="h1" style={{ marginBottom: 4 }}>Marcar Ponto</div>
        {nome && (
          <p className="muted" style={{ marginBottom: 8 }}>
            Olá, <strong>{nome}</strong>. Utilize esta página para registar a sua entrada e saída.
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

      {/* FORMULÁRIO PRINCIPAL */}
      <section className="card" style={{ marginBottom: 16, maxWidth: 520 }}>
        <h2 className="h2" style={{ marginBottom: 12 }}>Bater ponto</h2>

        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label className="muted">Tipo de registo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                border: '1px solid var(--border)',
                borderRadius: 10,
                background: '#fff',
              }}
            >
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
              <option value="in">In (legacy)</option>
              <option value="out">Out (legacy)</option>
            </select>
          </div>

          {(tipo === 'entrada' || tipo === 'saida') && (
            <div>
              <label className="muted">
                Foto no local ({tipo === 'entrada' ? 'check-in' : 'saída'})
              </label>

              {/* input real escondido */}
              <input
                id="foto-ponto-input"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={onPhotoChange}
                style={{ display: 'none' }}
              />

              {/* botão que dispara a câmara */}
              <label
                htmlFor="foto-ponto-input"
                className="btn btn-ghost"
                style={{
                  display: 'inline-block',
                  marginTop: 6,
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  background: '#fff',
                  fontWeight: 600,
                }}
              >
                {photoFile ? 'Trocar foto' : 'Tirar foto agora'}
              </label>

              <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                Tire uma foto no local com a câmara. Não é permitido utilizar imagens da galeria.
              </p>

              {photoPreview && (
                <div style={{ marginTop: 8 }}>
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
            </div>
          )}

          {gettingGeo && (
            <p className="muted">A obter localização do dispositivo…</p>
          )}

          {err && (
            <p style={{ color: 'crimson' }}>{err}</p>
          )}
          {msg && (
            <p style={{ color: 'green' }}>{msg}</p>
          )}

          <button
            className="btn btn-primary"
            onClick={baterPonto}
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

      {/* HISTÓRICO DE PONTO (resumo rápido) */}
      <section className="card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <h2 className="h2">Últimos registos de ponto</h2>
          <button
            className="btn btn-ghost"
            onClick={carregarUltimos}
            disabled={loadingLista}
          >
            {loadingLista ? 'A carregar…' : 'Recarregar'}
          </button>
        </div>

        {!ultimos.length && !loadingLista && (
          <p className="muted">Ainda não há registos de ponto.</p>
        )}

        {!!ultimos.length && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: 8 }}>Data / Hora</th>
                  <th style={{ padding: 8 }}>Tipo</th>
                  <th style={{ padding: 8 }}>Meta</th>
                </tr>
              </thead>
              <tbody>
                {ultimos.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: 8 }}>
                      {r.batida_at ? new Date(r.batida_at).toLocaleString() : '—'}
                    </td>
                    <td style={{ padding: 8 }}>{r.tipo || '—'}</td>
                    <td style={{ padding: 8, fontSize: 12 }}>
                      <pre
                        style={{
                          margin: 0,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          fontFamily: 'monospace',
                        }}
                      >
                        {r.meta ? JSON.stringify(r.meta) : '{}'}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {loadingLista && (
          <p className="muted" style={{ marginTop: 8 }}>
            A carregar registos…
          </p>
        )}
      </section>
    </main>
  );
}
