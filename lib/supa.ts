// lib/supa.ts
import { createClient } from '@supabase/supabase-js'

// -------------------------------------------------------------
// 🔹 Este módulo unifica o acesso ao Supabase no cliente (browser)
// -------------------------------------------------------------
//
// Por que assim:
// - Evita duplicar createClient() em cada página.
// - Mantém sessão persistente (login continua ativo).
// - Usa sempre as variáveis do .env ou Vercel.
// -------------------------------------------------------------

let browserClient: ReturnType<typeof createClient> | null = null

export function getBrowserSupabase() {
  if (typeof window === 'undefined') {
    throw new Error('getBrowserSupabase() só deve ser chamado no browser.')
  }

  if (browserClient) return browserClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  browserClient = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })

  return browserClient
}

