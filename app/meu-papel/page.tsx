"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Papel = "admin" | "gestor" | "externo" | null;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: true, autoRefreshToken: true } }
);

export default function MeuPapelPage() {
  const [papel, setPapel] = useState<Papel>(null);
  const [empresa, setEmpresa] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: userRes } = await supabase.auth.getUser();
        if (!userRes.user) {
          setLoading(false);
          return;
        }
        setEmail(userRes.user.email ?? null);

        const { data, error } = await supabase
          .from("profiles")
          .select("papel,empresa_id")
          .eq("user_id", userRes.user.id)
          .maybeSingle();

        if (error) throw error;

        setPapel((data as any)?.papel ?? null);
        setEmpresa((data as any)?.empresa_id ?? null);
        setLoading(false);
      } catch (e: any) {
        setErro(e?.message ?? "Falha ao carregar seu papel");
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div style={{ padding: 24 }}>Carregando…</div>;

  if (erro)
    return (
      <div style={{ padding: 24 }}>
        <h1>Erro</h1>
        <p>{erro}</p>
        <p><a href="/">Voltar</a></p>
      </div>
    );

  return (
    <div style={{ padding: 24 }}>
      <h1>Seu papel</h1>
      <p><strong>Email:</strong> {email ?? "-"}</p>
      <p><strong>Papel:</strong> {papel ?? "desconhecido"}</p>
      <p><strong>Empresa ID:</strong> {empresa ?? "-"}</p>
      {!papel && (
        <p style={{ marginTop: 12 }}>
          Se estiver vazio, crie/edite seu perfil em <code>public.profiles</code> no Supabase.
        </p>
      )}
      <p style={{ marginTop: 16 }}><a href="/">Voltar</a></p>
    </div>
  );
}
