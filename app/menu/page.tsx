"use client";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: true, autoRefreshToken: true } }
);

export default function MenuPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setEmail(data.user.email ?? null);
    })();
  }, [router]);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>CONFIANCE</h1>
      <p style={{ marginBottom: 16, color: "#444" }}>
        {email ? `Sessão: ${email}` : "A carregar utilizador…"}
      </p>
      <ul style={{ display: "grid", gap: 8, listStyle: "none", padding: 0 }}>
        <li><Link href="/ponto">Ponto (Colaborador)</Link></li>
        <li><Link href="/adm/pendencias">Pendências (ADM)</Link></li>
        <li><Link href="/adm/orcamentos">Orçamentos (ADM)</Link></li>
        <li><Link href="/perfil">Perfil</Link></li>
        <li><Link href="/logout">Terminar sessão</Link></li>
      </ul>
    </div>
  );
}
