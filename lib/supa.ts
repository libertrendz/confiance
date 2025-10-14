// lib/supa.ts
"use client";

import { createBrowserClient, createServerClient } from "@supabase/ssr";

// ---- BROWSER CLIENT (exportado como 'supa') ----
export const supa = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Assim que o app carrega, registramos UMA vez o listener.
// Ele envia o evento de auth para o endpoint que atualiza os cookies do servidor.
let _listenerAttached = false;
if (typeof window !== "undefined" && !_listenerAttached) {
  _listenerAttached = true;
  supa.auth.onAuthStateChange(async (event, session) => {
    try {
      await fetch("/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, session }),
      });
    } catch (e) {
      console.warn("Falha ao sincronizar sessão no servidor:", e);
    }
  });
}

// ---- SERVER FACTORY (opcional, se precisar em outros lugares) ----
export function supaServer(cookiesStore: ReturnType<typeof import("next/headers").cookies>) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookiesStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookiesStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookiesStore.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    }
  );
}
