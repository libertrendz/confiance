// lib/supa.ts
'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Cria um client do Supabase para uso no browser (componentes client). */
export function getBrowserSupabase(): SupabaseClient {
  return createBrowserClient(url, anon);
}

/** Singleton prático para componentes Client que só precisam do client direto. */
export const supa: SupabaseClient = getBrowserSupabase();
