// lib/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js';

export function getAdminSupabase() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY!; // <-- precisa estar no Vercel (Environment Variables)
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
