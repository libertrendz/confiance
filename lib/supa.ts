// lib/supa.ts
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

// cliente único para o browser
let _client: SupabaseClient | null = null;

export default function getBrowserSupabase(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  _client = createBrowserClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // importantíssimo: o parse da URL será feito manualmente na /auth/confirm
      detectSessionInUrl: false,
    },
  });

  return _client;
}
