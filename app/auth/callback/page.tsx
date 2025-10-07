export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
        const url = new URL(window.location.href);
        const hash = url.hash?.startsWith("#") ? url.hash.slice(1) : "";
        const hashParams = new URLSearchParams(hash);
        const code = url.searchParams.get("code");

        // Caso 1: Magic Link / reset de senha (fragmento com tokens)
        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token");

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token
          });
          if (error) throw error;

          // limpa o hash da URL
          window.history.replaceState({}, document.title, url.pathname);
          setMsg("Login concluído! Redirecionando...");
          window.location.replace("/");
          return;
        }

        // Caso 2: OAuth/PKCE (?code=...)
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(url.toString());
          if (error) throw error;

          setMsg("Login concluído! Redirecionando...");
          window.location.replace("/");
          return;
        }

        throw new Error("Nenhum parâmetro de autenticação encontrado na URL.");
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

