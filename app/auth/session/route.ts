// app/auth/session/route.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(req: Request) {
  try {
    const { event, session } = await req.json();

    const cookieStore = cookies();
    const supa = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: "", ...options, maxAge: 0 });
          },
        },
      }
    );

    // espelha no cookie do servidor
    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
      if (session?.access_token && session?.refresh_token) {
        await supa.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
      }
    } else if (event === "SIGNED_OUT") {
      await supa.auth.signOut();
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("auth/session POST error:", e);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
