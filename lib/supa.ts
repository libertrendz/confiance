// lib/supa.ts
import { createBrowserClient, SupabaseClient } from '@supabase/ssr';

let _client: SupabaseClient | null = null;

export default function getBrowserSupabase() {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) {
    throw new Error('Variáveis NEXT_PUBLIC_SUPABASE_URL/ANON ausentes.');
  }
  _client = createBrowserClient(url, anon, {
    cookies: {
      get() { return ''; },
      set() {},
      remove() {},
    },
  });
  return _client;
}
