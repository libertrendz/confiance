"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: true, autoRefreshToken: true } }
);

export default function AuthCallbackPage() {
  const [msg, setMsg] = useState("Finalizando login...");

  useEffect(() => {
    (async () => {
      try {
        const hasHash = typeof window !== "undefined" && window.location.hash?.length > 1;
        const hasCode = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("code");

        if (hasHash) {
          // Magic Link e reset de senha chegam como fragmento (#access_token=...)
          const { error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
          if (error) throw error;
          // remove o hash da URL
          window.history.replaceState({}, document.title, window.location.pathname);
          setMsg("Login concluído! Redirecionando...");
          window.location.replace("/");
          return;
        }

        if (hasCode) {
          // OAuth/PKCE chega com ?code=... na query
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (error) throw error;
          setMsg("Login concluído! Redirecionando...");
          window.location.replace("/");
          return;
        }

        throw new Error("Nenhum parâmetro de autenticação encontrado.");
      } catch (err: any) {
        setMsg("Erro: " + (err?.message || "falha ao processar callback"));
      }
    })();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>{msg}</h1>
    </div>
  );
}
