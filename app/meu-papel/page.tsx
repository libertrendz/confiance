"use client";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: true, autoRefreshToken: true } }
);

type Profile = {
  user_id: string;
  empresa_id: string;
  papel: string;
  nome: string;
  email?: string;
} | null;

export default function MeuPapelPage() {
  const [profile, setProfile] = useState<Profile>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.rpc("my_role");
        if (error) throw error;
        setProfile(data as Profile);
      } catch (e: any) {
        setErro(e.message);
      } finally {
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

  if (!profile)
    return (
      <div style={{ padding: 24 }}>
        <h1>Sem perfil</h1>
        <p>Seu usuário ainda não tem registro na tabela profiles.</p>
        <p><a href="/">Voltar</a></p>
      </div>
    );

  return (
    <div style={{ padding: 24 }}>
      <h1>Seu papel</h1>
      <p><strong>Nome:</strong> {profile.nome}</p>
      <p><strong>Papel:</strong> {profile.papel}</p>
      <p><strong>Empresa ID:</strong> {profile.empresa_id}</p>
      <p><strong>User ID:</strong> {profile.user_id}</p>
      <p><a href="/">Voltar</a></p>
    </div>
  );
}
