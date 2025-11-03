import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function getServerSupabase() {
  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createServerClient(url, anon, {
    cookies: {
      get(name: string) { return cookieStore.get(name)?.value; },
      set(name: string, value: string, options: any) { cookieStore.set(name, value, options); },
      remove(name: string, options: any) { cookieStore.set(name, '', { ...options, maxAge: 0 }); },
    },
  });
}

export async function GET(req: Request) {
  const supa = getServerSupabase();
  // escopo 'global' revoga os refresh tokens do usuário atual
  await supa.auth.signOut({ scope: 'global' });
  return NextResponse.redirect(new URL('/login', new URL(req.url).origin));
}
