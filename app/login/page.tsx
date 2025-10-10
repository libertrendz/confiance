"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: true, autoRefreshToken: true } }
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        // 🚨 IMPORTANTE: este é o destino do magic link
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) setMessage(`Erro: ${error.message}`);
    else setMessage("Verifique seu email e clique no link para entrar.");

    setLoading(false);
  }

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 400, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Entrar</h1>
      <form onSubmit={handleLogin} style={{ display: "grid", gap: 12 }}>
        <input
          type="email"
          placeholder="seu@email.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            padding: 10,
            border: "1px solid #ddd",
            borderRadius: 8,
            width: "100%",
          }}
        />
        <button
          disabled={loading}
          type="submit"
          style={{
            background: "#111",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 14px",
          }}
        >
          {loading ? "Enviando..." : "Enviar Magic Link"}
        </button>
      </form>
      {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </div>
  );
}
