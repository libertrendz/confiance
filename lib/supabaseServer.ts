// lib/supabaseServer.ts
import { cookies, headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!; // precisa estar setado no Vercel

// Cliente "admin" com Service Role: só usar em rotas /api/ (server), NUNCA no client.
export function getServiceSupabase() {
  return createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Cliente “por requisição”, lendo o bearer do cabeçalho (rotas /api/ se precisarmos)
export function getRouteSupabase() {
  const auth = headers().get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const supa = createClient(url, anon, { auth: { persistSession: false } });
  if (bearer) supa.auth.setAuth(bearer);
  return supa;
}
