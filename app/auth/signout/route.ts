import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer'; // mesmo alias do supa.ts

export async function GET(req: Request) {
  const supa = getServerSupabase();
  await supa.auth.signOut();
  return NextResponse.redirect(new URL('/login', new URL(req.url).origin));
}
