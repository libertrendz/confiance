// lib/supa.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

let cached: SupabaseClient | null = null

export function getBrowserSupabase(): SupabaseClient {
  if (!cached) {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
    }
    cached = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  }
  return cached
}

// Compatibilidade: quem importa `supa` continua funcionando.
export const supa = getBrowserSupabase()
export default supa
