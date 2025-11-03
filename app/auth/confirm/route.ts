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
    // ---- Fluxo PKCE moderno: ?code=... ----
    const code =
      url.searchParams.get('code') || // padrão mais comum
      url.searchParams.get('verification_code'); // variação vista em alguns provedores

    if (code) {
      const { error } = await supa.auth.exchangeCodeForSession(code);
      if (error) {
        const err = encodeURIComponent(error.message || 'code_exchange_failed');
        return NextResponse.redirect(new URL(`/login?err=${err}&flow=code`, url.origin));
      }
      // sucesso: cookies http-only gravados
      return NextResponse.redirect(new URL(next, url.origin));
    }

    // ---- Fluxo antigo (Magic Link): token_hash + type=magiclink ----
    const token_hash =
      url.searchParams.get('token_hash') ||
      url.searchParams.get('token') ||
      url.searchParams.get('tokenHash');

    const type = url.searchParams.get('type') as
      | 'magiclink' | 'recovery' | 'invite' | 'signup' | 'email_change' | null;

    if (token_hash && type) {
      const { error } = await supa.auth.verifyOtp({ type, token_hash });
      if (error) {
        const err = encodeURIComponent(error.message || 'otp_verify_failed');
        return NextResponse.redirect(new URL(`/login?err=${err}&flow=otp`, url.origin));
      }
      return NextResponse.redirect(new URL(next, url.origin));
    }

    // ---- Sem code/token: já existe sessão nos cookies? ----
    const { data } = await supa.auth.getSession();
    if (data.session) {
      return NextResponse.redirect(new URL(next, url.origin));
    }

    // Nada útil: volta ao login com causa explícita
    return NextResponse.redirect(new URL('/login?err=missing_code_or_token', url.origin));
  } catch (e: any) {
    const err = encodeURIComponent(e?.message || 'unknown_error');
    return NextResponse.redirect(new URL(`/login?err=${err}&flow=catch`, url.origin));
  }
}
