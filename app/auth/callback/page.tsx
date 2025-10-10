"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: true, autoRefreshToken: true } }
);

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Confirmando o acesso...");

  useEffect(() => {
    const confirmSession = async () => {
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (error) {
          console.warn(error);
          setStatus("Sessão inválida ou expirada. Voltando ao login...");
          setTimeout(() => router.replace("/login"), 1500);
          return;
        }

        setStatus("Login confirmado! Abrindo o menu...");
        setTimeout(() => router.replace("/menu"), 800);
      } catch (err) {
        console.error(err);
        setStatus("Erro inesperado. Voltando ao login...");
        setTimeout(() => router.replace("/login"), 1500);
      }
    };

    confirmSession();
  }, [router]);

  return (
    <div style={{ fontFamily: "system-ui", padding: 24 }}>
      <h1 style={{ fontSize: 20, marginBottom: 8 }}>Autenticando...</h1>
      <p>{status}</p>
    </div>
  );
}
