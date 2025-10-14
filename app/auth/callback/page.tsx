// app/auth/callback/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supa } from "@/lib/supa";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("A confirmar o login…");

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        // Garante que veio de um magic link / PKCE
        const hasTokenOrCode =
          typeof window !== "undefined" &&
          (window.location.hash.includes("access_token") ||
            window.location.search.includes("code="));

        if (!hasTokenOrCode) {
          setStatus("Link inválido ou expirado. Voltando ao login…");
          setTimeout(() => router.replace("/login"), 800);
          return;
        }

        // ⚠️ Aqui estava o erro: precisa passar a URL atual
        const { error } = await supa.auth.exchangeCodeForSession(
          window.location.href
        );

        if (error) {
          console.error("exchangeCodeForSession error:", error);
          setStatus("Não foi possível confirmar o login. Redirecionando…");
          setTimeout(() => router.replace("/login"), 800);
          return;
        }

        // Confirma se a sessão foi salva
        const { data } = await supa.auth.getSession();
        if (!mounted) return;

        if (data?.session) {
          setStatus("Login confirmado! Abrindo o menu…");
          setTimeout(() => router.replace("/menu"), 600);
        } else {
          setStatus("Sessão não encontrada. Voltando ao login…");
          setTimeout(() => router.replace("/login"), 800);
        }
      } catch (e) {
        console.error(e);
        if (!mounted) return;
        setStatus("Erro durante a confirmação. Voltando ao login…");
        setTimeout(() => router.replace("/login"), 800);
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
        Autenticando…
      </h1>
      <p>{status}</p>
    </div>
  );
}
