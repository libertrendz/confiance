"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: true, autoRefreshToken: true } }
);

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Confirmando acesso...");

  useEffect(() => {
    const run = async () => {
      try {
        // Troca o código/token do Magic Link por uma sessão válida
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);

        if (error) {
          // Se der erro, checa se por acaso a sessão já está ativa
          const { data } = await supabase.auth.getUser();
          if (data.user) {
            setStatus("Sessão já ativa. Abrindo o menu…");
            router.replace("/menu");
            return;
          }
          setStatus(`Não foi possível confirmar o login: ${error.message}`);
          setTimeout(() => router.replace("/login"), 1200);
          return;
        }

        setStatus("Acesso confirmado. Abrindo o menu…");
        router.replace("/menu");
      } catch {
        setStatus("Erro inesperado. Voltando ao login…");
        setTimeout(() => router.replace("/login"), 1200);
      }
    };

    run();
  }, [router]);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 18, marginBottom: 8 }}>Autenticando…</h1>
      <p>{status}</p>
    </div>
  );
}
