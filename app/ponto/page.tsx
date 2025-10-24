'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

//
// ====== CONFIGURAÇÕES RÁPIDAS (ajuste se necessário) ======
// Nome do bucket de fotos no Storage:
const BUCKET_NAME = 'ponto-fotos';
// Nome da tabela onde vamos inserir os registos:
const TABLE_NAME = 'ponto_registos';
// Campo opcional de tipo de batida: 'entrada' | 'saida' | 'pausa' | 'retorno'
const TIPOS = ['entrada','saida','pausa','retorno'] as const;
type TipoBatida = (typeof TIPOS)[number];

//
// ====== SUPABASE (browser) ======
function getBrowserSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Faltam envs do Supabase: NEXT_PUBLIC_SUPABASE_URL e/ou NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
}

export default function PontoPage() {
  const supa = getBrowserSupabase();

  // ====== ESTADOS ======
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [useFrontCamera, setUseFrontCamera] = useState(true);

  const [fotoDataUrl, setFotoDataUrl] = useState<string | null>(null);
  const [geo, setGeo] = useState<{ lat: number; lng: number; acc?: number } | null>(null);
  const [tipo, setTipo] = useState<TipoBatida>('entrada');

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // ====== INÍCIO: verifica sessão e carrega câmera/geo ======
  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        setMsg(null);

        // 1) Sessão
        const { data: u } = await supa.auth.getUser();
        if (!u.user) {
          window.location.replace('/login?next=' + encodeURIComponent('/ponto'));
          return;
        }
        setUserEmail(u.user.email ?? null);
        setUserId(u.user.id);

        // 2) Empresa padrão (pega a primeira empresa ou aquela que estiver no seu modelo)
        //    Ajuste a query conforme sua estrutura:
        //    - se tiver tabela perfis: selecione a empresa pela relação perfil -> empresa
        //    - aqui vou buscar a primeira empresa existente
        const { data: emp, error: eEmp } = await supa
          .from('empresas')
          .select('id')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (eEmp) throw eEmp;
        if (!emp?.id) {
          throw new Error('Nenhuma empresa encontrada. Crie uma empresa antes de marcar ponto.');
        }
        setEmpresaId(emp.id);

        // 3) Câmera
        await iniciarCamera(useFrontCamera);

        // 4) Geo
        obterGeo();
      } catch (e: any) {
        console.error(e);
        setErr(e?.message ?? 'Erro ao iniciar a página de ponto.');
      } finally {
        setLoading(false);
      }
    })();

    // Cleanup: parar a stream de vídeo ao desmontar
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // alternar câmera
  async function alternarCamera() {
    try {
      setUseFrontCamera((prev) => !prev);
      await iniciarCamera(!useFrontCamera);
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao alternar câmera');
    }
  }

  async function iniciarCamera(front: boolean) {
    try {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: front ? 'user' : 'environment',
          width: { ideal: 720 },
          height: { ideal: 720 },
        },
        audio: false,
      };
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
    } catch (e: any) {
      throw new Error('Não foi possível acessar a câmera. Permita acesso no navegador.');
    }
  }

  function obterGeo() {
    if (!navigator.geolocation) {
      setErr('Geolocalização não suportada pelo navegador.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          acc: pos.coords.accuracy,
        });
      },
      (errPos) => {
        console.warn('geo error', errPos);
        setErr('Não foi possível obter geolocalização. Permita acesso no navegador.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  function tirarFoto() {
    setErr(null);
    setMsg(null);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const w = 720;
    const h = 720;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // espelha a câmera frontal para “naturalizar” a selfie
    if (useFrontCamera) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setFotoDataUrl(dataUrl);
  }

  async function uploadFoto(
    supa: SupabaseClient,
    empresaId: string,
    userId: string,
    dataUrl: string
  ): Promise<string> {
    // dataURL -> Blob
    const res = await fetch(dataUrl);
    const blob = await res.blob();

    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const path = `${empresaId}/${userId}/${ts}.jpg`;

    const { data, error } = await supa.storage
      .from(BUCKET_NAME)
      .upload(path, blob, { contentType: 'image/jpeg', upsert: false });

    if (error) {
      // erros comuns:
      //  - bucket não existe
      //  - política de storage não permite upload por usuário autenticado
      throw new Error(
        `Falha no upload da foto: ${error.message}. Verifique se o bucket "${BUCKET_NAME}" existe e se as policies permitem upload para usuários autenticados.`
      );
    }

    // URL pública (se o bucket for público) — senão, você pode usar getPublicUrl() / createSignedUrl()
    const { data: pub } = supa.storage.from(BUCKET_NAME).getPublicUrl(data.path);
    return pub.publicUrl;
  }

  async function salvarBatida() {
    try {
      setSaving(true);
      setErr(null);
      setMsg(null);

      if (!userId || !empresaId) throw new Error('Usuário/Empresa não definidos.');
      if (!fotoDataUrl) throw new Error('Tire a foto antes de salvar.');
      if (!geo) throw new Error('Geolocalização não disponível — clique em “Atualizar localização” e permita acesso.');

      // 1) upload foto
      const fotoUrl = await uploadFoto(supa, empresaId, userId, fotoDataUrl);

      // 2) inserir registo
      // Ajuste os campos conforme o seu schema de 2025xxxx_ponto_foto_geo.sql.
      // Aqui uso colunas comuns: user_id, empresa_id, ts_cliente, tipo, geo_lat, geo_lng, geo_acc, foto_url
      const payload: Record<string, any> = {
        user_id: userId,
        empresa_id: empresaId,
        ts_cliente: new Date().toISOString(),
        tipo,
        geo_lat: geo.lat,
        geo_lng: geo.lng,
        geo_acc: geo.acc ?? null,
        foto_url: fotoUrl,
      };

      const { error } = await supa.from(TABLE_NAME).insert(payload);
      if (error) {
        throw new Error(
          `Não foi possível gravar o registo de ponto: ${error.message}. 
Verifique se a tabela "${TABLE_NAME}" existe e se as policies RLS permitem INSERT para usuários autenticados.`
        );
      }

      setMsg('Ponto registado com sucesso!');
      // limpa foto para nova batida se quiser
      // setFotoDataUrl(null);
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 24, fontFamily: 'system-ui' }}>A carregar…</div>;
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 24, fontFamily: 'system-ui' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Marcação de Ponto</h1>
        <div>
          <small style={{ opacity: 0.8 }}>{userEmail}</small>
          <a href="/menu" style={{ marginLeft: 12, textDecoration: 'none' }}>
            <button style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, background: '#fff' }}>
              Ir para o menu
            </button>
          </a>
        </div>
      </header>

      <section style={{ marginTop: 16, display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gap: 8 }}>
          <label>Tipo de registo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoBatida)}
            style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 8 }}
          >
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center' }}>
          <div style={{ position: 'relative', border: '1px solid #eee', borderRadius: 12, overflow: 'hidden' }}>
            {!fotoDataUrl ? (
              <video ref={videoRef} style={{ width: '100%', background: '#000' }} playsInline muted />
            ) : (
              <img src={fotoDataUrl} alt="captura" style={{ width: '100%', display: 'block' }} />
            )}
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            <button
              onClick={alternarCamera}
              style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, background: '#fff' }}
            >
              Alternar câmera
            </button>
            {!fotoDataUrl ? (
              <button
                onClick={tirarFoto}
                style={{ padding: '10px 14px', border: '1px solid #111', background: '#111', color: '#fff', borderRadius: 8 }}
              >
                Tirar foto
              </button>
            ) : (
              <button
                onClick={() => setFotoDataUrl(null)}
                style={{ padding: '10px 14px', border: '1px solid #ddd', background: '#fff', borderRadius: 8 }}
              >
                Refazer foto
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 4 }}>
          <div>
            <b>Localização:</b>{' '}
            {geo ? (
              <>
                lat {geo.lat.toFixed(6)}, lng {geo.lng.toFixed(6)} {geo.acc ? `(±${Math.round(geo.acc)}m)` : ''}
              </>
            ) : (
              'não disponível'
            )}
          </div>
          <div>
            <button
              onClick={obterGeo}
              style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, background: '#fff' }}
            >
              Atualizar localização
            </button>
          </div>
        </div>

        <div>
          <button
            onClick={salvarBatida}
            disabled={saving || !fotoDataUrl || !geo}
            style={{
              padding: '10px 14px',
              border: '1px solid #111',
              background: saving ? '#444' : '#111',
              color: '#fff',
              borderRadius: 8,
              opacity: saving ? 0.7 : 1,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'A salvar…' : 'Salvar registo'}
          </button>
        </div>

        {msg && <p style={{ marginTop: 8, color: '#14532d' }}>{msg}</p>}
        {err && <p style={{ marginTop: 8, color: '#7f1d1d' }}>Erro: {err}</p>}
      </section>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
