
export const dynamic = 'force-dynamic';
export const revalidate = 0;

"use client";

import { useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: true, autoRefreshToken: true } }
);

export default function LogoutPage() {
  const router = useRouter();
  useEffect(() => {
    (async () => {
      await supabase.auth.signOut().catch(() => {});
      router.replace("/login");
    })();
  }, [router]);
  return <div style={{ padding: 24, fontFamily: "system-ui" }}>A terminar sessão…</div>;
}
