// lib/supabaseServer.ts
import { createClient } from '@supabase/supabase-js';

/**
 * Cliente ADMIN (Service Role). Uso EXCLUSIVO em rotas server-side.
 * Nunca importa este módulo do client/browser.
 */
export function getServiceSupabase() {
  // Aceita SUPABASE_URL ou cai para NEXT_PUBLIC_SUPABASE_URL
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    '';

  const serviceRole = process.env.SUPABASE_SERVICE_ROLE || '';

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
