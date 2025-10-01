"use client";

import { useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const SITE_URL = process.env.NEXTPUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "");
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  const supabase = useMemo(() => {
    if (!SUPABASE_URL || !SUPABASE_ANON) return null;
    return createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setMsg("Configuração do Supabase ausente.");
      return;
    }
    setMsg("Enviando...");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${SITE_URL}/auth/callback` }
    });
    if (error) setMsg("Erro: " + error.message);
    else setMsg("Link enviado! Verifique seu e-mail.");
  }

  return (
    <div style={{ padding: 24, maxWidth: 420, margin: "32px auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>
        Entrar no CONFIANCE
      </h1>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="email@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 6 }}
        />
        <button type="submit" style={{ marginTop: 12, padding: "10px 14px", border: "1px solid #111", borderRadius: 6 }}>
          Enviar Magic Link
        </button>
      </form>
      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </div>
  );
}
