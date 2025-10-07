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

export default function HomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) router.replace("/menu");
      else router.replace("/login");
    })();
  }, [router]);

  return <div style={{ padding: 24, fontFamily: "system-ui" }}>A carregar…</div>;
}
