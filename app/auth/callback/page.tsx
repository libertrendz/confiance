"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: true, autoRefreshToken: true } }
);

export default function AuthCallback() {
  const [status, setStatus] = useState<"loading"|"ok"|"error">("loading");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // 1) tente trocar o código do magic link por sessão
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (error) {
          // Se não houver code/token no URL, cai aqui também
          setErr(error.message);
          setStatus("error");
          return;
        }
        setStatus("ok");
        // 2) redireciona para o app após gravar a sessão
        window.location.replace("/menu");
      } catch (e: any) {
        setErr(e?.message ?? "Erro inesperado");
        setStatus("error");
      }
    })();
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      {status === "loading" && <p>A finalizar sessão…</p>}
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
