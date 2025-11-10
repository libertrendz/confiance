// lib/supabaseServer.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE!; // obrigatória

if (!URL || !ANON) throw new Error('Env Supabase ANON/URL em falta.');
if (!SERVICE) throw new Error('Env SUPABASE_SERVICE_ROLE em falta.');

export function getServiceSupabase(): SupabaseClient {
  // Service role para Admin API e bypass RLS quando aplicável
  return createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function getServerSupabase(): SupabaseClient {
  // Anon server-side quando precisa (quase não usamos aqui)
  return createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
}
