// app/menu/MenuClient.tsx
"use client";

import { useEffect, useState } from "react";
import { supa } from "@/lib/supa";               // mantém seu client do browser
import { getProjetoPadrao, getResumoFases } from "@/lib/queries";

type Props = { userEmail: string };

export default function MenuClient({ userEmail }: Props) {
  const [loading, setLoading] = useState(true);
  const [projeto, setProjeto] = useState<{ id: string; nome: string } | null>(null);
  const [fases, setFases] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // dupla conferência no cliente (cinto de segurança)
        const { data } = await supa.auth.getUser();
        if (!data.user) {
          const next = encodeURIComponent("/menu");
          window.location.replace(`/login?next=${next}`);
          return;
        }

        const proj = await getProjetoPadrao(supa);
        setProjeto(proj);

        const resumos = await getResumoFases(supa, proj?.id);
        setFases(resumos || []);
      } catch (e: any) {
        setErr(e?.message || "Erro ao carregar dados.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function sair() {
    await supa.auth.signOut();
    window.location.replace("/login");
  }

  if (loading) return <div style={{ padding: 24 }}>A carregar…</div>;
  if (err) return <div style={{ padding: 24, color: "#7f1d1d" }}>Erro: {err}</div>;

  const totalPlaneado = fases.reduce((a, c) => a + (c.planeado || 0), 0);
  const totalExec = fases.reduce((a, c) => a + (c.executado || 0), 0);
  const perc = totalPlaneado > 0 ? Math.round((totalExec / totalPlaneado) * 100) : 0;

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Menu</h1>
        <div>
          <span style={{ marginRight: 12 }}>{userEmail}</span>
          <button
            onClick={sair}
            style={{ padding: "8px 12px", border: "1px solid #111", background: "#111", color: "#fff", borderRadius: 8 }}
          >
            Sair
          </button>
        </div>
      </div>

      <div style={{ marginTop: 16, padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{projeto?.nome ?? "Projeto"}</h2>
        <p>
          <b>Planeado:</b> € {totalPlaneado.toFixed(2)} &nbsp;|&nbsp; <b>Executado:</b> € {totalExec.toFixed(2)} &nbsp;|&nbsp;{" "}
          <b>{perc}%</b>
        </p>
      </div>

      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        {fases.map((f) => (
          <div key={f.faseId} style={{ padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>{f.fase}</h3>
              {f.risco && <span style={{ fontSize: 12, color: "#7f1d1d" }}>⚠ perto do limite</span>}
            </div>
            <p style={{ marginTop: 4 }}>
              Planeado: € {Number(f.planeado || 0).toFixed(2)} &nbsp;|&nbsp; Executado: € {Number(f.executado || 0).toFixed(2)} &nbsp;|&nbsp;{" "}
              {f.perc}%
            </p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20 }}>
        <a href="/adm/despesas/nova" style={{ textDecoration: "none" }}>
          <button style={{ padding: "10px 14px", border: "1px solid #111", background: "#111", color: "#fff", borderRadius: 8 }}>
            + Lançar Despesa
          </button>
        </a>
      </div>
    </div>
  );
}
