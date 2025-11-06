// lib/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js';

export function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !service) throw new Error('Missing Supabase envs for admin client');
  return createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}