"use client";

import { useEffect, useMemo, useState } from "react";
import CameraPunch, { type PunchPayload } from "../../components/CameraPunch";
import { createClient } from "@supabase/supabase-js";

// ======= CONFIG =======
const STORAGE_BUCKET = "pontos-fotos";
const OFFLINE_KEY = "confiance_pendentes_v1";
type TipoPonto = "entrada" | "pausa" | "retorno" | "saida";

// ======= SUPABASE CLIENT =======
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: true, autoRefreshToken: true } }
);

// ======= TIPOS =======
type Pendencia = {
  idLocal: string;
  tipo: TipoPonto;
  capturado_em: string;
  geo: { lat: number; lon: number; accuracy: number };
  fotoDataUrl?: string;
};

type PontoRow = {
  id: string;
  tipo: TipoPonto;
  created_at: string;
  capturado_em: string | null;
  foto_url: string | null;
  geo_lat: number | null;
  geo_lon: number | null;
  geo_accuracy: number | null;
};

// ======= HELPERS =======
function readQueue(): Pendencia[] {
  try {
    const raw = localStorage.getItem(OFFLINE_KEY);
    return raw ? (JSON.parse(raw) as Pendencia[]) : [];
  } catch {
    return [];
  }
}
function writeQueue(list: Pendencia[]) {
  localStorage.setItem(OFFLINE_KEY, JSON.stringify(list));
}
function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(",");
  const mime = meta.match(/data:(.*);base64/)?.[1] || "image/jpeg";
  const bin = atob(base64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
function tipoLabel(t: TipoPonto) {
  switch (t) {
    case "entrada":
      return "Entrada";
    case "pausa":
      return "Pausa";
    case "retorno":
      return "Retorno";
    case "saida":
      return "Saída";
  }
}
function isMobileUA() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

// ======= PÁGINA =======
export default function PontoPage() {
  const [tipo, setTipo] = useState<TipoPonto>("entrada");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<PontoRow[]>([]);
  const [queue, setQueue] = useState<Pendencia[]>([]);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);

  const maxAccuracy = useMemo(() => (isMobileUA() ? 50 : 75), []);

  // Carregar sessão e empresa via RPC my_role()
  useEffect(() => {
    const load = async () => {
      setError(null);
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        setNeedsLogin(true);
        return;
      }
      setUserId(u.user.id);

      const { data: role, error: roleErr } = await supabase.rpc("my_role");
      if (roleErr) {
        setError("Falha ao carregar perfil/empresa.");
        return;
      }
      if (!role || !role.empresa_id) {
        setError("Perfil incompleto. Contacte o administrador para associar a sua conta a uma empresa.");
        return;
      }
      setEmpresaId(role.empresa_id as string);
    };
    load();
  }, []);

  // Carregar fila offline + histórico
  useEffect(() => {
    setQueue(readQueue());
  }, []);
  useEffect(() => {
    if (!userId) return;
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    (async () => {
      const { data, error } = await supabase
        .from("pontos")
        .select("id,tipo,created_at,capturado_em,foto_url,geo_lat,geo_lon,geo_accuracy")
        .eq("user_id", userId)
        .gte("created_at", since)
        .order("created_at", { ascending: false });
      if (!error && data) setHistory(data as PontoRow[]);
    })();
  }, [userId]);

  const requirePhoto = useMemo(
    () => tipo === "entrada" || tipo === "saida",
    [tipo]
  );

  // Enviar uma batida
  async function enviarPonto(payload: PunchPayload) {
    // guarda pendente e empurra para login se não tiver sessão/empresa
    if (!userId || !empresaId) {
      const pend: Pendencia = {
        idLocal: crypto.randomUUID(),
        tipo: payload.tipo,
        capturado_em: payload.capturado_em,
        geo: payload.geo,
        fotoDataUrl: payload.fotoDataUrl,
      };
      const updated = [pend, ...readQueue()];
      writeQueue(updated);
      setQueue(updated);
      setNeedsLogin(true);
      setError("Sessão inexistente. Por favor, inicie sessão para enviar o registo.");
      // redirecionar para login
      if (typeof window !== "undefined") window.location.href = "/login";
      return;
    }

    setError(null);
    setMessage(null);
    setSending(true);
    try {
      // 1) preparar imagem (se obrigatória)
      let fotoPath: string | null = null;
      if (requirePhoto) {
        const blob =
          payload.fotoBlob ||
          (payload.fotoDataUrl ? dataUrlToBlob(payload.fotoDataUrl) : null);
        if (!blob) throw new Error("Falha ao preparar fotografia.");
        const id = crypto.randomUUID();
        fotoPath = `${empresaId}/${userId}/${id}_${payload.tipo}.jpg`;
        const up = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(fotoPath, blob, { upsert: false });
        if (up.error) throw up.error;
      }

      // 2) inserir na tabela pontos
      const insertRes = await supabase.from("pontos").insert({
        empresa_id: empresaId,
        user_id: userId,
        tipo: payload.tipo,
        foto_url: fotoPath,
        geo_lat: payload.geo.lat,
        geo_lon: payload.geo.lon,
        geo_accuracy: payload.geo.accuracy,
        capturado_em: payload.capturado_em,
      });
      if (insertRes.error) {
        if (fotoPath) {
          await supabase.storage.from(STORAGE_BUCKET).remove([fotoPath]).catch(() => {});
        }
        throw insertRes.error;
      }

      setMessage("Registo enviado com sucesso.");
      // refresh rápido do histórico
      const { data: fresh, error: hErr } = await supabase
        .from("pontos")
        .select("id,tipo,created_at,capturado_em,foto_url,geo_lat,geo_lon,geo_accuracy")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!hErr && fresh) setHistory(fresh as PontoRow[]);
    } catch (e: any) {
      // sem drama: guarda na fila offline
      const pend: Pendencia = {
        idLocal: crypto.randomUUID(),
        tipo: payload.tipo,
        capturado_em: payload.capturado_em,
        geo: payload.geo,
        fotoDataUrl: payload.fotoDataUrl,
      };
      const updated = [pend, ...readQueue()];
      writeQueue(updated);
      setQueue(updated);
      setError("Sem ligação ou erro no envio. O registo foi guardado em pendentes.");
    } finally {
      setSending(false);
    }
  }

  // Enviar pendentes
  async function enviarPendentes() {
    if (!empresaId || !userId) {
      setNeedsLogin(true);
      setError("Sessão inexistente. Por favor, inicie sessão.");
      if (typeof window !== "undefined") window.location.href = "/login";
      return;
    }
    setError(null);
    setMessage(null);
    const current = readQueue();
    if (!current.length) {
      setMessage("Não existem registos pendentes.");
      return;
    }
    const successIds: string[] = [];
    for (const p of current) {
      try {
        let fotoPath: string | null = null;
        const precisaFoto = p.tipo === "entrada" || p.tipo === "saida";
        if (precisaFoto) {
          if (!p.fotoDataUrl) throw new Error("Pendência sem foto.");
          const blob = dataUrlToBlob(p.fotoDataUrl);
          const id = crypto.randomUUID();
          fotoPath = `${empresaId}/${userId}/${id}_${p.tipo}.jpg`;
          const up = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(fotoPath, blob, { upsert: false });
          if (up.error) throw up.error;
        }

        const ins = await supabase.from("pontos").insert({
          empresa_id: empresaId,
          user_id: userId,
          tipo: p.tipo,
          foto_url: fotoPath,
          geo_lat: p.geo.lat,
          geo_lon: p.geo.lon,
          geo_accuracy: p.geo.accuracy,
          capturado_em: p.capturado_em,
        });
        if (ins.error) {
          if (fotoPath) {
            await supabase.storage.from(STORAGE_BUCKET).remove([fotoPath]).catch(() => {});
          }
          throw ins.error;
        }

        successIds.push(p.idLocal);
      } catch {
        // deixa na fila; passa para a próxima
      }
    }
    const left = readQueue().filter((x) => !successIds.includes(x.idLocal));
    writeQueue(left);
    setQueue(left);
    if (successIds.length) setMessage(`${successIds.length} registo(s) enviado(s).`);
    if (!successIds.length) setError("Não foi possível enviar os pendentes agora.");
    const { data: fresh } = await supabase
      .from("pontos")
      .select("id,tipo,created_at,capturado_em,foto_url,geo_lat,geo_lon,geo_accuracy")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (fresh) setHistory(fresh as PontoRow[]);
  }

  // UI sem sessão
  if (needsLogin) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto", padding: 16, fontFamily: "system-ui" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Ponto</h1>
        <div
          style={{
            marginTop: 12,
            padding: 12,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#7f1d1d",
            borderRadius: 8,
          }}
        >
          Sessão inexistente. Por favor, inicie sessão para registar o ponto.
        </div>
        <a
          href="/login"
          style={{
            display: "inline-block",
            marginTop: 12,
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #111",
            background: "#111",
            color: "#fff",
            textDecoration: "none",
          }}
        >
          Iniciar sessão
        </a>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Ponto</h1>

      {/* Selector de tipo */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {(["entrada", "pausa", "retorno", "saida"] as TipoPonto[]).map((t) => (
          <button
            key={t}
            onClick={() => setTipo(t)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid",
              borderColor: t === tipo ? "#111" : "#ddd",
              background: t === tipo ? "#111" : "#fff",
              color: t === tipo ? "#fff" : "#111",
              cursor: "pointer",
            }}
          >
            {tipoLabel(t)}
          </button>
        ))}
      </div>

      {/* Componente de câmara e geo */}
      <CameraPunch
        tipo={tipo}
        onConfirm={(payload) => enviarPonto(payload)}
        maxAccuracyMeters={maxAccuracy}
        captureWidth={960}
      />
      <p style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
        Precisão exigida: ≤ {maxAccuracy} m {isMobileUA() ? "" : "(modo teste em desktop)"}.
      </p>

      {/* Mensagens */}
      {message && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            border: "1px solid #bbf7d0",
            background: "#f0fdf4",
            color: "#14532d",
            borderRadius: 8,
          }}
        >
          {message}
        </div>
      )}
      {error && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#7f1d1d",
            borderRadius: 8,
          }}
        >
          {error}
        </div>
      )}

      {/* Fila offline */}
      <div
        style={{
          marginTop: 16,
          padding: 12,
          border: "1px solid #eee",
          borderRadius: 8,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong>Pendentes offline</strong>
          <button
            onClick={enviarPendentes}
            disabled={sending || !queue.length}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #111",
              background: queue.length ? "#111" : "#f3f4f6",
              color: queue.length ? "#fff" : "#9ca3af",
              cursor: queue.length ? "pointer" : "not-allowed",
            }}
          >
            Enviar pendentes ({queue.length})
          </button>
        </div>
        {queue.length ? (
          <ul style={{ marginTop: 8, fontSize: 14, lineHeight: 1.4 }}>
            {queue.map((p) => (
              <li key={p.idLocal}>
                {tipoLabel(p.tipo)} — {new Date(p.capturado_em).toLocaleString()} —{" "}
                {Math.round(p.geo.accuracy)} m
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ marginTop: 8, color: "#666", fontSize: 14 }}>
            Sem registos pendentes.
          </p>
        )}
      </div>

      {/* Histórico 7 dias */}
      <div
        style={{
          marginTop: 16,
          padding: 12,
          border: "1px solid #eee",
          borderRadius: 8,
        }}
      >
        <strong>Histórico (7 dias)</strong>
        {history.length ? (
          <table style={{ width: "100%", fontSize: 14, marginTop: 8, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thTd()}>Data</th>
                <th style={thTd()}>Tipo</th>
                <th style={thTd()}>Exactidão</th>
                <th style={thTd()}>Foto</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td style={thTd(false)}>{new Date(h.created_at).toLocaleString()}</td>
                  <td style={thTd(false)}>{tipoLabel(h.tipo)}</td>
                  <td style={thTd(false)}>
                    {h.geo_accuracy != null ? `${Math.round(h.geo_accuracy)} m` : "-"}
                  </td>
                  <td style={thTd(false)}>{h.foto_url ? "Sim" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ marginTop: 8, color: "#666", fontSize: 14 }}>Sem registos.</p>
        )}
      </div>
    </div>
  );
}

// estilos toscos mas honestos
function thTd(header = true) {
  return {
    textAlign: "left",
    padding: "6px 8px",
    borderBottom: "1px solid #eee",
    fontWeight: header ? 600 : 400,
  } as const;
}
