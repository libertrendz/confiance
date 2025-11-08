// lib/supabaseServer.ts
import { createClient } from '@supabase/supabase-js';

/**
 * Cliente ADMIN (Service Role), uso EXCLUSIVO em rotas server-side.
 * Lê a env canônica SUPABASE_SERVICE_ROLE, com fallbacks para históricos.
 * Nunca importe isso no client/browser.
 */
export function getServiceSupabase() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    '';

  // Canônica + compatibilidade retroativa
  const serviceRole =
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SERVICE_ROLE ||
    '';

  if (!serviceRole) {
    throw new Error('Env ausente: SUPABASE_SERVICE_ROLE');
  }
  if (!url) {
    throw new Error('Env ausente: SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_URL');
  }

  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-confiance-svc': 'admin' } },
  });
}
