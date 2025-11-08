// lib/supabaseServer.ts
// Server-side Supabase para App Router, lendo o token do request (Authorization)
// ou, se faltar, dos cookies http-only (sb-access-token).

import { cookies } from 'next/headers';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type Opts = { req?: Request };

export function getServerSupabase({ req }: Opts = {}): SupabaseClient {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // 1) Tenta header Authorization do próprio request
  let access = '';
  if (req) {
    const h = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    if (h.startsWith('Bearer ')) access = h.slice('Bearer '.length);
  }

  // 2) Se não veio via header, tenta cookie http-only (sb-access-token)
  if (!access) {
    try {
      const c = cookies();
      access = c.get('sb-access-token')?.value || '';
    } catch {
      // nada
    }
  }

  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: access ? { Authorization: `Bearer ${access}` } : {} },
  });
}
