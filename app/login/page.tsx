"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      // NÃO renovar automaticamente — sessão “caduca” e volta ao login
      autoRefreshToken: false,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Redireciona se já estiver autenticado
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) window.location.replace("/menu");
    })();
  }, []);

  // Força logout quando o access token expirar (sem autoRefreshToken)
  // Isto torna o "time-box" efetivo mesmo no Free plan.
  const expiryTimer = useRef<number | null>(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const exp = data.session?.expires_at; // epoch (segundos)
      if (!mounted) return;
      if (expiryTimer.current) window.clearTimeout(expiryTimer.current);
      if (exp) {
        const ms = Math.max(exp * 1000 - Date.now(), 0);
        expiryTimer.current = window.setTimeout(async () => {
          // limpa sessão local e vai ao /login
          await supabase.auth.signOut();
          window.location.replace("/login");
        }, ms);
      }
    })();

    return () => {
      mounted = false;
      if (expiryTimer.current) window.clearTimeout(expiryTimer.current);
    };
  }, []);

  async function enviarMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    setSubmitting(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          // Depois do clique no email, a sessão é criada nesta rota
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) setErr(error.message);
      else setMsg("Enviámos um link de acesso para o seu email.");
    } catch (e: any) {
      setErr(e?.message ?? "Ocorreu um erro ao enviar o link.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", maxWidth: 480, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Entrar</h1>

      <form onSubmit={enviarMagicLink} style={{ display: "grid", gap: 8 }}>
        <label style={{ display: "grid", gap: 4 }}>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="o.seu@email.pt"
            autoComplete="email"
            inputMode="email"
            style={{
              display: "block",
              width: "100%",
              padding: 10,
              border: "1px solid #ddd",
              borderRadius: 8,
            }}
          />
        </label>

        <button
          type="submit"
          disabled={submitting || !email}
          style={{
            padding: "10px 14px",
            border: "1px solid #111",
            background: submitting ? "#444" : "#111",
            opacity: submitting ? 0.7 : 1,
            cursor: submitting ? "not-allowed" : "pointer",
            color: "#fff",
            borderRadius: 8,
          }}
        >
          {submitting ? "A enviar..." : "Enviar Magic Link"}
        </button>
      </form>

      {msg && <p style={{ marginTop: 8, color: "#14532d" }}>{msg}</p>}
      {err && <p style={{ marginTop: 8, color: "#7f1d1d" }}>{err}</p>}

      <p style={{ marginTop: 16, fontSize: 12, color: "#555" }}>
        A sessão expira automaticamente após algum tempo por motivos de segurança. Quando expirar,
        será solicitado novo início de sessão.
      </p>
    </div>
  );
}
