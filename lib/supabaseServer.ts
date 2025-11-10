// lib/supabaseServer.ts
import { createClient } from '@supabase/supabase-js';

/**
 * Usa sempre este client com chave SERVICE ROLE nas rotas /api/admin/**
 * → ignora RLS
 * → permite .auth.admin.* e .from().upsert() sem bloqueio
 */
export function getServiceSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) {
    throw new Error('Env ausente: SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Client “seguro” com anon key — uso mínimo, apenas server-side público
 */
export function getServerSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) {
    throw new Error('Env ausente: NEXT_PUBLIC_SUPABASE_URL e/ou ANON_KEY');
  }
  return createClient(url, anon, { auth: { persistSession: false } });
}
