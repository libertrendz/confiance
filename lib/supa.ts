// lib/supa.ts
import { createClient } from '@supabase/supabase-js'

export const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false, // vamos tratar o callback manualmente
    },
  }
)
