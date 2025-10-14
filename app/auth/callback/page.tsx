// app/auth/callback/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supa } from "@/lib/supa";

export default function CallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Confirmando login…");

  useEffect(() => {
    (async () => {
      try {
        const url = typeof window !== "undefined" ? window.location.href : "";

        // 1) Primeiro tenta PKCE (algumas versões exigem objeto com 'code' lido da URL)
        const tryPkce = async () => {
          try {
            const codeMatch = url.match(/[?&]code=([^&]+)/);
            const code = codeMatch ? decodeURIComponent(codeMatch[1]) : undefined;

            if (typeof (supa.auth as any).exchangeCodeForSession === "function" && code) {
              const { error } = await (supa.auth as any).exchangeCodeForSession({ code });
              if (!error) return true;
              console.warn("exchangeCodeForSession falhou:", error?.message || error);
            }
          } catch (e) {
            console.warn("exchangeCodeForSession exception:", e);
          }
          return false;
        };

        // 2) Depois tenta Magic Link (hash com access_token)
        const tryHash = async () => {
          try {
            const hasHash =
              typeof window !== "undefined" &&
              window.location.hash &&
              (window.location.hash.includes("access_token") || window.location.hash.includes("refresh_token"));

            if (hasHash && typeof (supa.auth as any).getSessionFromUrl === "function") {
              const { error } = await (supa.auth as any).getSessionFromUrl({ storeSession: true });
              if (!error) return true;
              console.warn("getSessionFromUrl falhou:", error?.message || error);
            }
          } catch (e) {
            console.warn("getSessionFromUrl exception:", e);
          }
          return false;
        };

        const ok = (await tryPkce()) || (await tryHash());

        if (!ok) {
          // Última tentativa: talvez já esteja logado
          const { data } = await supa.auth.getUser();
          if (!data.user) {
            setStatus("Não foi possível confirmar o login. Redirecionando para login…");
            setTimeout(() => router.replace("/login"), 800);
            return;
          }
        }

        setStatus("Login confirmado! Abrindo o menu…");
        setTimeout(() => router.replace("/menu"), 600);
      } catch (e) {
        console.error(e);
        setStatus("Erro inesperado. Redirecionando para login…");
        setTimeout(() => router.replace("/login"), 800);
      }
    })();
  }, [router]);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Aguarde…</h1>
      <p>{status}</p>
    </div>
  );
}
