// lib/supa.ts
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

/**
 * Retorna um SupabaseClient para uso no browser (CSR).
 * Singleton simples para evitar recriações.
 */
export default function getBrowserSupabase(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) {
    throw new Error('Variáveis NEXT_PUBLIC_SUPABASE_URL/ANON_KEY ausentes.');
  }
  _client = createBrowserClient(url, anon, {
    cookies: {
      // no browser não precisamos implementar; SSR cuidaria disso
      get() { return ''; },
      set() {},
      remove() {},
    },
  });
  return _client;
}
