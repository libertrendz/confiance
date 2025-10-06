"use client";

import { useEffect, useRef, useState } from "react";

type TipoPonto = "entrada" | "pausa" | "retorno" | "saida";

export type PunchPayload = {
  tipo: TipoPonto;
  capturado_em: string; // ISO
  geo: { lat: number; lon: number; accuracy: number };
  // A página decide se quer enviar dataURL ou Blob. Ambos aqui para flexibilidade.
  fotoDataUrl?: string;
  fotoBlob?: Blob;
};

type Props = {
  /** Tipo da batida (entrada/pausa/retorno/saída) */
  tipo: TipoPonto;
  /** Chamado quando o utilizador confirma com todos os requisitos cumpridos */
  onConfirm: (data: PunchPayload) => void;
  /** Precisão máxima aceitável em metros (default 50m) */
  maxAccuracyMeters?: number;
  /** Largura da foto capturada (px). Altura mantém proporção do vídeo */
  captureWidth?: number;
};

export default function CameraPunch({
  tipo,
  onConfirm,
  maxAccuracyMeters = 50,
  captureWidth = 960,
}: Props) {
  const requirePhoto = tipo === "entrada" || tipo === "saida";

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [geo, setGeo] = useState<{ lat: number; lon: number; accuracy: number } | null>(null);
  const [fotoDataUrl, setFotoDataUrl] = useState<string | null>(null);
  const [fotoBlob, setFotoBlob] = useState<Blob | null>(null);
  const [capturadoEm, setCapturadoEm] = useState<string | null>(null);

  const [loadingCam, setLoadingCam] = useState(false);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Abrir câmara traseira
  useEffect(() => {
    let cancelled = false;
    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setErro("Este dispositivo/navegador não suporta acesso à câmara.");
        return;
      }
      setLoadingCam(true);
      setErro(null);
      try {
        // Preferir câmara traseira
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) return;
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // iOS safari precisa do .play() explícito após setar srcObject
          await videoRef.current.play().catch(() => {});
        }
        setCameraReady(true);
      } catch (e: any) {
        setErro("Não foi possível aceder à câmara. Verifique permissões.");
      } finally {
        if (!cancelled) setLoadingCam(false);
      }
    }
    startCamera();
    return () => {
      cancelled = true;
      // Fechar stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Ler geolocalização
  async function obterGeo(highAccuracy = true) {
    if (!navigator.geolocation) {
      setErro("Geolocalização não suportada neste dispositivo.");
      return;
    }
    setLoadingGeo(true);
    setErro(null);
    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          setGeo({ lat: latitude, lon: longitude, accuracy });
          setLoadingGeo(false);
          resolve();
        },
        (err) => {
          setErro("Falha ao obter localização. Verifique permissões/GPS.");
          setLoadingGeo(false);
          resolve();
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  }

  // Capturar frame da câmara para canvas e gerar dataURL + Blob
  function capturarFoto() {
    setErro(null);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      setErro("Câmara não pronta.");
      return;
    }
    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;
    const targetW = captureWidth;
    const targetH = Math.round((vh / vw) * targetW);

    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setErro("Falha no contexto do canvas.");
      return;
    }
    ctx.drawImage(video, 0, 0, targetW, targetH);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setFotoDataUrl(dataUrl);
    canvas.toBlob(
      (blob) => {
        if (blob) setFotoBlob(blob);
      },
      "image/jpeg",
      0.92
    );
    setCapturadoEm(new Date().toISOString());
  }

  const prontoParaConfirmar =
    !!geo &&
    geo.accuracy <= maxAccuracyMeters &&
    (!requirePhoto || (!!fotoDataUrl && !!capturadoEm));

  function limparCaptura() {
    setFotoDataUrl(null);
    setFotoBlob(null);
    setCapturadoEm(null);
  }

  function confirmar() {
    if (!prontoParaConfirmar || !geo) {
      setErro("Requisitos incompletos.");
      return;
    }
    const payload: PunchPayload = {
      tipo,
      capturado_em: capturadoEm || new Date().toISOString(),
      geo: { lat: geo.lat, lon: geo.lon, accuracy: geo.accuracy },
      ...(fotoDataUrl ? { fotoDataUrl } : {}),
      ...(fotoBlob ? { fotoBlob } : {}),
    };
    onConfirm(payload);
  }

  // Auto-obter geo ao montar
  useEffect(() => {
    obterGeo(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ fontFamily: "system-ui", width: "100%", maxWidth: 600, margin: "0 auto" }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
        {tituloPorTipo(tipo)}
      </h2>

      {/* Pré-visualização da câmara */}
      <div
        style={{
          position: "relative",
          background: "#000",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: "100%", display: cameraReady ? "block" : "none" }}
        />
        {!cameraReady && (
          <div style={{ color: "#fff", padding: 16, textAlign: "center" }}>
            {loadingCam ? "A abrir câmara…" : "Câmara indisponível"}
          </div>
        )}
        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>

      {/* Botões de acção da câmara */}
      {requirePhoto && (
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={capturarFoto}
            disabled={!cameraReady}
            style={btnStyle()}
          >
            Tirar fotografia
          </button>
          {fotoDataUrl && (
            <button type="button" onClick={limparCaptura} style={btnGhost()}>
              Limpar
            </button>
          )}
        </div>
      )}

      {/* Pré-visualização da foto */}
      {requirePhoto && fotoDataUrl && (
        <div style={{ marginTop: 12 }}>
          <img
            src={fotoDataUrl}
            alt="Fotografia capturada"
            style={{ width: "100%", borderRadius: 8, border: "1px solid #ddd" }}
          />
          <p style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
            Capturada em: {new Date(capturadoEm || "").toLocaleString()}
          </p>
        </div>
      )}

      {/* Geolocalização */}
      <div style={{ marginTop: 16, padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong>Localização</strong>
          <button
            type="button"
            onClick={() => obterGeo(true)}
            disabled={loadingGeo}
            style={btnGhost()}
          >
            {loadingGeo ? "A obter…" : "Actualizar"}
          </button>
        </div>
        <div style={{ fontSize: 14, marginTop: 8 }}>
          {geo ? (
            <>
              <div>Lat: {geo.lat.toFixed(6)}</div>
              <div>Lon: {geo.lon.toFixed(6)}</div>
              <div>
                Exactidão: {Math.round(geo.accuracy)} m{" "}
                {geo.accuracy > maxAccuracyMeters ? (
                  <span style={{ color: "#b91c1c" }}>
                    (acima do máximo de {maxAccuracyMeters} m)
                  </span>
                ) : (
                  <span style={{ color: "#166534" }}>(ok)</span>
                )}
              </div>
            </>
          ) : (
            <div>Sem dados de geolocalização.</div>
          )}
        </div>
      </div>

      {/* Erro */}
      {erro && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            border: "1px solid #fca5a5",
            background: "#fef2f2",
            color: "#7f1d1d",
            borderRadius: 8,
            fontSize: 14,
          }}
        >
          {erro}
        </div>
      )}

      {/* Confirmar */}
      <div style={{ marginTop: 16 }}>
        <button
          type="button"
          onClick={confirmar}
          disabled={!prontoParaConfirmar}
          style={btnPrimary(!prontoParaConfirmar)}
        >
          Confirmar registo
        </button>
        <p style={{ fontSize: 12, color: "#666", marginTop: 8, lineHeight: 1.4 }}>
          Regras: {requirePhoto ? "foto obrigatória + " : ""}geolocalização obrigatória com
          exactidão ≤ {maxAccuracyMeters} m.
        </p>
      </div>
    </div>
  );
}

/* ---------- helpers visuais toscamente dignos (vamos trocar por shadcn/ui depois) ---------- */
function btnStyle() {
  return {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #111",
    background: "#111",
    color: "#fff",
    cursor: "pointer",
  } as const;
}
function btnGhost() {
  return {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #ddd",
    background: "#fff",
    color: "#111",
    cursor: "pointer",
  } as const;
}
function btnPrimary(disabled: boolean) {
  return {
    padding: "12px 16px",
    borderRadius: 8,
    border: "1px solid",
    borderColor: disabled ? "#ddd" : "#111",
    background: disabled ? "#f3f4f6" : "#111",
    color: disabled ? "#9ca3af" : "#fff",
    cursor: disabled ? "not-allowed" : "pointer",
    width: "100%",
  } as const;
}
function tituloPorTipo(tipo: TipoPonto) {
  switch (tipo) {
    case "entrada":
      return "Bater ponto: Entrada";
    case "pausa":
      return "Bater ponto: Pausa";
    case "retorno":
      return "Bater ponto: Retorno";
    case "saida":
      return "Bater ponto: Saída";
  }
}
