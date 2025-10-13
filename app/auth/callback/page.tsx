"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: true, autoRefreshToken: true } }
);

export default function AuthCallbackPage() {
  const router = useRouter();
  const qs = useSearchParams();
  const [status, setStatus] = useState("Autenticando...");

  useEffect(() => {
    (async () => {
      try {
        // 0) Já tem sessão? Vai pro /menu
        const { data: s0 } = await supabase.auth.getSession();
        if (s0.session) {
          setStatus("Sessão já ativa. Abrindo o menu...");
          setTimeout(() => router.replace("/menu"), 400);
          return;
        }

        // 1) Fluxo com fragmento (#access_token=&refresh_token=)
        const hash = typeof window !== "undefined" ? window.location.hash : "";
        if (hash && hash.includes("access_token")) {
          const params = new URLSearchParams(hash.replace(/^#/, ""));
          const access_token = params.get("access_token") || undefined;
          const refresh_token = params.get("refresh_token") || undefined;

          if (access_token && refresh_token) {
            setStatus("Confirmando login (token no hash)...");
            const { error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (error) throw error;
            setStatus("Login confirmado! Abrindo o menu...");
            setTimeout(() => router.replace("/menu"), 600);
            return;
          }
        }

        // 2) Fluxo PKCE (?code=...)
        const code = qs.get("code");
        if (code) {
          setStatus("Confirmando login (código PKCE)...");
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          setStatus("Login confirmado! Abrindo o menu...");
          setTimeout(() => router.replace("/menu"), 600);
          return;
        }

        // 3) Nada encontrado → volta ao login
        setStatus("Link inválido ou expirado. Voltando ao login...");
        setTimeout(() => router.replace("/login"), 1000);
      } catch (e: any) {
        console.error(e);
        setStatus(
          e?.message || "Não foi possível confirmar o login. Voltando ao login..."
        );
        setTimeout(() => router.replace("/login"), 1400);
      }
    })();
  }, [qs, router]);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
        Autenticação
      </h1>
      <p>{status}</p>
    </div>
  );
}
