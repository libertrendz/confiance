// lib/supabaseServer.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Client com service_role para rotas /api/admin/**
 * Ignora sessão e cookies; bypass de RLS pelas policies já previstas.
 */
export function getServiceSupabase(): SupabaseClient {
  return createClient(URL, SERVICE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Client “impessoal” que respeita o bearer passado no header Authorization.
 * Uso: rotas públicas/protegidas que precisam agir em nome do utilizador.
 * Ex.: const supa = getBearerSupabase(req.headers.get('authorization'));
 */
export function getBearerSupabase(authHeader?: string | null): SupabaseClient {
  const bearer =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

  return createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: bearer ? { Authorization: `Bearer ${bearer}` } : {},
    },
  });
}
