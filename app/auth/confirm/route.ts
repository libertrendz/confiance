// app/auth/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function getServerSupabase() {
  const cookieStore = cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error('Faltam envs do Supabase: NEXT_PUBLIC_SUPABASE_URL e/ou NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createServerClient(url, anon, {
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

export async function GET(req: NextRequest) {
  const supa = getServerSupabase();
  const url = new URL(req.url);
  const next = url.searchParams.get('next') || '/menu';

  try {
    // Fluxo PKCE moderno: ?code=...
    if (url.searchParams.has('code')) {
      // SSR: passe a URL completa
      const { error } = await supa.auth.exchangeCodeForSession(url.toString());
      if (error) throw error;
      return NextResponse.redirect(new URL(next, req.url));
    }

    // Fluxo antigo: token_hash + type
    const token_hash =
      url.searchParams.get('token_hash') ||
      url.searchParams.get('token') ||
      url.searchParams.get('tokenHash');

    const type = url.searchParams.get('type') as
      | 'magiclink' | 'recovery' | 'invite' | 'signup' | 'email_change' | null;

    if (token_hash && type) {
      const { error } = await supa.auth.verifyOtp({ type, token_hash });
      if (error) throw error;
      return NextResponse.redirect(new URL(next, req.url));
    }

    // Sem code/token: já tem sessão nos cookies?
    const { data } = await supa.auth.getSession();
    if (data.session) {
      return NextResponse.redirect(new URL(next, req.url));
    }

    return NextResponse.redirect(new URL('/login', req.url));
  } catch (err) {
    console.error('Auth confirm error:', err);
    return NextResponse.redirect(new URL('/login', req.url));
  }
}
