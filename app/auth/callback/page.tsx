"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AuthCallbackPage() {
  const [msg, setMsg] = useState("Finalizando login...");

  useEffect(() => {
    async function handleCallback() {
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
      if (error) {
        setMsg("Erro: " + error.message);
      } else {
        setMsg("Login concluído! Redirecionando...");
        window.location.href = "/";
      }
    }
    handleCallback();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>{msg}</h1>
    </div>
  );
}
