"use client";
import { ReactNode, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    async function check() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setAuthed(!!data.session);
      setReady(true);
    }

    // Estado inicial
    check();

    // Reage a mudanças (p.ex., logo após callback setar a sessão)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session);
      setReady(true);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!ready) return <p style={{ padding: 24 }}>Carregando...</p>;
  if (!authed) {
    if (typeof window !== "undefined") window.location.assign("/login");
    return null;
  }

  return <>{children}</>;
}
