// app/auth/signout/route.ts
import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';

export async function GET(req: Request) {
  const supa = getServerSupabase();
  await supa.auth.signOut(); // limpa cookies http-only
  return NextResponse.redirect(new URL('/login', new URL(req.url).origin));
}
