"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function CallbackInner() {
  const qs = useSearchParams();
  const [status, setStatus] = useState("Autenticando...");

  useEffect(() => {
    (async () => {
      try {
        // 0) Já logado?
        const { data: s0 } = await supabase.auth.getSession();
        if (s0.session) {
          setStatus("Sessão já ativa. Abrindo o menu...");
          setTimeout(() => window.location.assign("/menu"), 300);
          return;
        }

        // 1) Fragmento (#access_token)
        const hash = typeof window !== "undefined" ? window.location.hash : "";
        if (hash && hash.includes("access_token")) {
          const params = new URLSearchParams(hash.replace(/^#/, ""));
          const access_token = params.get("access_token") || undefined;
          const refresh_token = params.get("refresh_token") || undefined;

          if (access_token && refresh_token) {
            setStatus("Confirmando login...");
            const { error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (error) throw error;
            setStatus("Login confirmado! Abrindo o menu...");
            setTimeout(() => window.location.assign("/menu"), 400);
            return;
          }
        }

        // 2) PKCE (?code=)
        const code = qs.get("code");
        if (code) {
          setStatus("Confirmando login (PKCE)...");
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          setStatus("Login confirmado! Abrindo o menu...");
          setTimeout(() => window.location.assign("/menu"), 400);
          return;
        }

        // 3) Fallback
        setStatus("Link inválido ou expirado. Voltando ao login...");
        setTimeout(() => window.location.assign("/login"), 800);
      } catch (e: any) {
        console.error(e);
        setStatus(e?.message || "Erro ao confirmar login. Voltando ao login...");
        setTimeout(() => window.location.assign("/login"), 1200);
      }
    })();
  }, [qs]);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Autenticação</h1>
      <p>{status}</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<p>Carregando autenticação...</p>}>
      <CallbackInner />
    </Suspense>
  );
}
