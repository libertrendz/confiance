"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: { persistSession: true, autoRefreshToken: true },
  }
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    setErr(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setErr(error.message);
    } else {
      setMsg(
        "Enviámos um link mágico para o seu email. Clique nele para aceder ao sistema."
      );
      setEmail("");
    }

    setLoading(false);
  }

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 400,
          width: "100%",
          padding: 24,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
        }}
      >
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          Entrar no Confiance
        </h1>

        <form onSubmit={handleLogin} style={{ display: "grid", gap: 12 }}>
          <label style={{ fontSize: 14 }}>
            Email
            <input
              type="email"
              required
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #ddd",
                borderRadius: 8,
                marginTop: 4,
              }}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "10px 14px",
              background: "#111",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            {loading ? "Enviando..." : "Enviar Magic Link"}
          </button>
        </form>

        {msg && (
          <p style={{ marginTop: 16, color: "#14532d", fontSize: 14 }}>{msg}</p>
        )}
        {err && (
          <p style={{ marginTop: 16, color: "#7f1d1d", fontSize: 14 }}>{err}</p>
        )}
      </div>
    </div>
  );
}
