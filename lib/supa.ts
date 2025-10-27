// lib/supa.ts — versão estável e compatível com @supabase/ssr + supabase-js
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export default function getBrowserSupabase() {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!url || !anon) {
    throw new Error(
      'Variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY ausentes.'
    );
  }

  _client = createBrowserClient(url, anon, {
    cookies: {
      get() {
        return '';
      },
      set() {},
      remove() {},
    },
  });

  return _client;
}
