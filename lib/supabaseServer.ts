// lib/supabaseServer.ts
import { createClient } from '@supabase/supabase-js';

export function getServiceSupabase() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key  = process.env.SUPABASE_SERVICE_ROLE!;
  if (!url || !key) throw new Error('Env ausente: SUPABASE_SERVICE_ROLE ou NEXT_PUBLIC_SUPABASE_URL');
  return createClient(url, key, { auth: { persistSession: false } });
}
