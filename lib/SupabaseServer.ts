// lib/supabaseServer.ts  (ou src/lib/supabaseServer.ts se teu projeto usa /src)
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export function getServerSupabase() {
  const cookieStore = cookies();

  // URL do servidor e anon pública
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnon) {
    throw new Error('Faltam envs do Supabase: SUPABASE_URL e/ou NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        cookieStore.set(name, value, options);
      },
      remove(name: string, options: any) {
        cookieStore.set(name, '', { ...options, maxAge: 0 });
      },
    },
  });
}
