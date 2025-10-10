"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: true, autoRefreshToken: true } }
);

function getQueryParam(name: string) {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Confirmando o acesso...");

  useEffect(() => {
    const run = async () => {
      try {
        // 1) Tenta fluxo PKCE (URL com ?code=)
        const hasCode = typeof window !== "undefined" && new URL(window.location.href).searchParams.get("code");
        if (hasCode) {
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (!error) {
            setStatus("Login confirmado! Abrindo o menu...");
            setTimeout(() => router.replace("/menu"), 600);
            return;
          }
        }

        // 2) Tenta fluxo com access_token no fragmento (#access_token=...)
        // (alguns magic links antigos/variações usam isso)
        const hasHash = typeof window !== "undefined" && window.location.hash.includes("access_token");
        if (hasHash) {
          const { error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
          if (!error) {
            setStatus("Login confirmado! Abrindo o menu...");
            setTimeout(() => router.replace("/menu"), 600);
            return;
          }
        }

        // 3) Tenta verificação por token_hash (variante de magic link)
        const tokenHash = getQueryParam("token_hash");
        const type = getQueryParam("type") || "magiclink";
        if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({ type: type as any, token_hash: tokenHash });
          if (!error) {
            setStatus("Login confirmado! Abrindo o menu...");
            setTimeout(() => router.replace("/menu"), 600);
            return;
          }
        }

        // 4) Se nada deu certo, checa se já tem sessão (às vezes já está logado)
        const { data: sess } = await supabase.auth.getSession();
        if (sess.session) {
          setStatus("Sessão já ativa. Abrindo o menu...");
          setTimeout(() => router.replace("/menu"), 600);
          return;
        }

        // 5) Falhou tudo: volta para o login
        setStatus("Sessão inválida ou expirada. Voltando ao login...");
        setTimeout(() => router.replace("/login"), 1400);
      } catch (err) {
        console.warn(err);
        setStatus("Erro inesperado. Voltando ao login...");
        setTimeout(() => router.replace("/login"), 1400);
      }
    };

    run();
  }, [router]);

  return (
    <div style={{ fontFamily: "system-ui", padding: 24 }}>
      <h1 style={{ fontSize: 20, marginBottom: 8 }}>Autenticando...</h1>
      <p>{status}</p>
    </div>
  );
}
