// lib/supa.ts
'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

/**
 * Sempre use:  import getBrowserSupabase from '@/lib/supa'
 * e depois:     const supa = getBrowserSupabase()
 */
export default function getBrowserSupabase(): SupabaseClient {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !key) {
    throw new Error('Supabase URL/Anon Key ausentes nas variáveis de ambiente.');
  }

  browserClient = createBrowserClient(url, key, {
    cookies: {
      get() {
        return typeof document !== 'undefined' ? document.cookie : '';
      },
      set(value) {
        if (typeof document !== 'undefined') document.cookie = value;
      },
      remove(name) {
        if (typeof document !== 'undefined') {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        }
      },
    },
  });

  return browserClient;
}
