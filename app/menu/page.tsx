// app/menu/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supa } from "@/lib/supa";
import { getProjetoPadrao, getResumoFases } from "@/lib/queries";

type Projeto = { id: string; nome: string };
type ResumoFase = {
  faseId: string;
  fase: string;
  planeado: number;   // valor orçado/planejado
  executado: number;  // valor executado
  perc?: number;      // (executado/planeado)*100 arredondado
  risco?: boolean;    // alerta (ex.: > 80%)
};

export default function MenuPage() {
  const [checkedAuth, setCheckedAuth] = useState(false); // só redireciona após checar
  const [loading, setLoading] = useState(true);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [fases, setFases] = useState<ResumoFase[]>([]);
  const [err, setErr] = useState<string | null>(null);

  // formatação de moeda simples
  const fmt = useMemo(
    () =>
      new Intl.NumberFormat("pt-PT", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
      }),
    []
  );

  useEffect(() => {
    let mounted = true;

    async function boot() {
      try {
        // 1) Checar sessão de forma confiável
        const { data: s } = await supa.auth.getSession();
        const session = s?.session ?? null;

        if (!mounted) return;

        if (!session) {
          setCheckedAuth(true);
          // sem sessão -> redireciona para login com retorno
          const next = encodeURIComponent("/menu");
          window.location.replace(`/login?next=${next}`);
          return;
        }

        // sessão ok
        setUserEmail(session.user?.email ?? null);

        // 2) Carregar projeto padrão
        const proj = await getProjetoPadrao();
        if (!mounted) return;

        if (!proj) {
          // Sem projeto padrão — mostra estado mas não quebra
          setProjeto(null);
          setFases([]);
          setErr(null);
          setLoading(false);
          setCheckedAuth(true);
          return;
        }

        setProjeto({ id: proj.id, nome: proj.nome });

        // 3) Carregar resumo das fases (por projeto)
        const rows = await getResumoFases(proj.id);
        if (!mounted) return;

        // normaliza e calcula %/risco no cliente (caso o SQL não devolva)
        const list: ResumoFase[] = (rows ?? []).map((r: any) => {
          const planeado = Number(r.planeado || 0);
          const executado = Number(r.executado || 0);
          const perc =
            planeado > 0 ? Math.round((executado / planeado) * 100) : 0;
          const risco = planeado > 0 && perc >= 80; // regra simples de alerta
          return {
            faseId: String(r.faseId ?? r.fase_id ?? r.id),
            fase: String(r.fase ?? r.nome ?? "Fase"),
            planeado,
            executado,
            perc,
            risco,
          };
        });

        setFases(list);
        setErr(null);
      } catch (e: any) {
        console.error(e);
        setErr(e?.message || "Erro ao carregar dados.");
      } finally {
        if (mounted) {
          setLoading(false);
          setCheckedAuth(true);
        }
      }
    }

    boot();

    // 4) Reagir a mudanças de sessão (ex.: logout em outra aba)
    const { data: sub } = supa.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        const next = encodeURIComponent("/menu");
        window.location.replace(`/login?next=${next}`);
      } else {
        setUserEmail(session.user?.email ?? null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function sair() {
    try {
      await supa.auth.signOut();
    } finally {
      window.location.replace("/login");
    }
  }

  // enquanto ainda não checou auth, evita “piscar”
  if (!checkedAuth) {
    return <div style={{ padding: 24 }}>A carregar…</div>;
  }

  if (loading) return <div style={{ padding: 24 }}>A carregar…</div>;
  if (err)
    return (
      <div style={{ padding: 24, color: "#7f1d1d" }}>
        <b>Erro:</b> {err}
      </div>
    );

  const totalPlaneado = fases.reduce((a, c) => a + (c.planeado || 0), 0);
  const totalExec = fases.reduce((a, c) => a + (c.executado || 0), 0);
  const percTot =
    totalPlaneado > 0 ? Math.round((totalExec / totalPlaneado) * 100) : 0;

  return (
    <div
      style={{
        maxWidth: 920,
        margin: "0 auto",
        padding: 24,
        fontFamily: "system-ui",
      }}
    >
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Menu</h1>
        <div>
          {userEmail && <span style={{ marginRight: 12 }}>{userEmail}</span>}
          <button
            onClick={sair}
            style={{
              padding: "8px 12px",
              border: "1px solid #111",
              background: "#111",
              color: "#fff",
              borderRadius: 8,
            }}
          >
            Sair
          </button>
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          padding: 16,
          border: "1px solid #eee",
          borderRadius: 12,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
          {projeto?.nome ?? "Projeto"}
        </h2>
        <p>
          <b>Planeado:</b> {fmt.format(totalPlaneado)} &nbsp;|&nbsp;{" "}
          <b>Executado:</b> {fmt.format(totalExec)} &nbsp;|&nbsp;{" "}
          <b>{percTot}%</b>
        </p>
      </div>

      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        {fases.map((f) => (
          <div
            key={f.faseId}
            style={{ padding: 16, border: "1px solid #eee", borderRadius: 12 }}
          >
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>{f.fase}</h3>
              {f.risco && (
                <span style={{ fontSize: 12, color: "#7f1d1d" }}>
                  ⚠ perto do limite
                </span>
              )}
            </div>
            <p style={{ marginTop: 4 }}>
              Planeado: {fmt.format(f.planeado)} &nbsp;|&nbsp; Executado:{" "}
              {fmt.format(f.executado)} &nbsp;|&nbsp; {f.perc ?? 0}%
            </p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20 }}>
        <a href="/adm/despesas/nova" style={{ textDecoration: "none" }}>
          <button
            style={{
              padding: "10px 14px",
              border: "1px solid #111",
              background: "#111",
              color: "#fff",
              borderRadius: 8,
            }}
          >
            + Lançar Despesa
          </button>
        </a>
      </div>
    </div>
  );
}
