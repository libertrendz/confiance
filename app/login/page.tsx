"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: true, autoRefreshToken: true } }
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [logged, setLogged] = useState<boolean | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setLogged(!!data.user));
  }, []);

  async function enviarMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null); setErr(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setErr(error.message);
    else setMsg("Enviámos um link de acesso para o seu email.");
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", maxWidth: 480, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Entrar</h1>

      {logged ? (
        <div style={{ display: "grid", gap: 12 }}>
          <p>Já existe uma sessão ativa neste navegador.</p>
          <button onClick={() => (window.location.href = "/menu")}
                  style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #111", background: "#111", color: "#fff" }}>
            Ir para o menu
          </button>
          <button onClick={async () => { await supabase.auth.signOut(); setLogged(false); }}
                  style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", background: "#fff" }}>
            Terminar sessão
          </button>
        </div>
      ) : (
        <form onSubmit={enviarMagicLink} style={{ display: "grid", gap: 8 }}>
          <label>
            Email
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                   style={{ display: "block", width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 8 }} />
          </label>
          <button type="submit"
                  style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #111", background: "#111", color: "#fff" }}>
            Enviar Magic Link
          </button>
        </form>
      )}

      {msg && <p style={{ marginTop: 8, color: "#14532d" }}>{msg}</p>}
      {err && <p style={{ marginTop: 8, color: "#7f1d1d" }}>{err}</p>}
    </div>
  );
}
