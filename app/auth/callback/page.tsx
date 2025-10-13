"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: true, autoRefreshToken: true } }
);

function CallbackInner() {
  const router = useRouter();
  const qs = useSearchParams();
  const [status, setStatus] = useState("Autenticando...");

  useEffect(() => {
    (async () => {
      try {
        // 0) Sessão já ativa
        const { data: s0 } = await supabase.auth.getSession();
        if (s0.session) {
          setStatus("Sessão já ativa. Abrindo o menu...");
          setTimeout(() => router.replace("/menu"), 400);
          return;
        }

        // 1) Token no fragmento (#access_token)
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
            setTimeout(() => router.replace("/menu"), 600);
            return;
          }
        }

        // 2) PKCE (?code=)
        const code = qs.get("code");
        if (code) {
          setStatus("Confirmando login...");
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          setStatus("Login confirmado! Abrindo o menu...");
          setTimeout(() => router.replace("/menu"), 600);
          return;
        }

        // 3) Fallback
        setStatus("Link inválido ou expirado. Voltando ao login...");
        setTimeout(() => router.replace("/login"), 1000);
      } catch (e: any) {
        console.error(e);
        setStatus(
          e?.message || "Erro ao confirmar login. Voltando ao login..."
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

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<p>Carregando autenticação...</p>}>
      <CallbackInner />
    </Suspense>
  );
}
