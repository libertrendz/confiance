"use client";
export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { createClient, User } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: true, autoRefreshToken: true } }
);

export default function PerfilPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user ?? null);
      setLoading(false);
    };
    run();
  }, []);

  if (loading) return <div style={{ padding: 24 }}>Carregando…</div>;

  if (!user)
    return (
      <div style={{ padding: 24 }}>
        <h1>Sem sessão</h1>
        <p>Vá para <a href="/login">/login</a> e faça o login por Magic Link.</p>
      </div>
    );

  return (
    <div style={{ padding: 24 }}>
      <h1>Perfil</h1>
      <p><strong>Email:</strong> {user.email}</p>
      <p><strong>User ID:</strong> {user.id}</p>
      <p>Se isso apareceu, sua sessão está ativa no browser.</p>
      <p><a href="/">Voltar</a></p>
    </div>
  );
}
