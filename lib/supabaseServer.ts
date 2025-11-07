// lib/supabaseServer.ts
// Server-side Supabase com contexto de sessão via cookies HTTP-only,
// sem @supabase/ssr. Funciona no Vercel App Router.

import { cookies } from 'next/headers';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _serverClient: SupabaseClient | null = null;

export function getServerSupabase() {
  if (_serverClient) return _serverClient;

  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Lê o access token http-only definido pelo Supabase Auth.
  // Cookie padrão (v2): 'sb-access-token'
  const cookieStore = cookies();
  const access = cookieStore.get('sb-access-token')?.value || '';

  _serverClient = createClient(url, anon, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      // Injeta o token na Authorization para que auth.getUser() funcione no servidor.
      headers: access ? { Authorization: `Bearer ${access}` } : {},
    },
  });

  return _serverClient;
}
