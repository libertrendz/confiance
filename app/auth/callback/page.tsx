"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: true, autoRefreshToken: true } }
);

function parseHash(hash: string) {
  // hash estilo "#access_token=...&refresh_token=..."
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  return { access_token, refresh_token };
}

export default function AuthCallback() {
  const [status, setStatus] = useState<"loading"|"ok"|"error">("loading");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);

        // 1) Fluxo com code (PKCE: OAuth/magic link com ?code=)
        const code = url.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(url.toString());
          if (error) throw error;
          setStatus("ok");
          window.location.replace("/menu");
          return;
        }

        // 2) Fluxo com token_hash (links modernos de OTP do Supabase)
        const token_hash = url.searchParams.get("token_hash");
        const type = (url.searchParams.get("type") ?? "magiclink") as
          | "magiclink" | "recovery" | "invite" | "signup" | "email";
        const email = url.searchParams.get("email"); // Supabase envia em vários casos

        if (token_hash && email) {
          const { error } = await supabase.auth.verifyOtp({
            type: type === "email" ? "email" : (type as any),
            token_hash,
            email
          });
          if (error) throw error;
          setStatus("ok");
          window.location.replace("/menu");
          return;
        }

        // 3) Fluxo com fragmento (#access_token=...&refresh_token=...)
        if (window.location.hash) {
          const { access_token, refresh_token } = parseHash(window.location.hash);
          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) throw error;
            setStatus("ok");
            window.location.replace("/menu");
            return;
          }
        }

        // Nada reconhecido
        throw new Error("Link de login inválido ou expirado.");
      } catch (e: any) {
        setErr(e?.message ?? "Erro inesperado");
        setStatus("error");
      }
    })();
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      {status === "loading" && <p>A confirmar login…</p>}
      {status === "error" && (
        <div>
          <p style={{ color: "#7f1d1d" }}>
            Não foi possível confirmar o login: {err}
          </p>
          <a href="/login">Voltar ao login</a>
        </div>
      )}
    </div>
  );
}
