// app/auth/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

function sanitizeNext(nextRaw: string | null): string {
  if (!nextRaw) return '/menu';
  try {
    const url = new URL(nextRaw, 'http://x');
    const p = url.pathname + (url.search || '');
    return p.startsWith('/') ? p : '/menu';
  } catch {
    return '/menu';
  }
}

function getServerSupabase() {
  const cookieStore = cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error('Faltam envs: NEXT_PUBLIC_SUPABASE_URL e/ou NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        cookieStore.set(name, value, {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          ...options,
        });
      },
      remove(name: string, options: any) {
        cookieStore.set(name, '', {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 0,
          ...options,
        });
      },
    },
  });
}

export async function GET(req: NextRequest) {
  const supa = getServerSupabase();
  const url = new URL(req.url);
  const next = sanitizeNext(url.searchParams.get('next'));

  try {
    // Magic link / invite: token_hash + type (mais estável pro teu fluxo)
    const token_hash =
      url.searchParams.get('token_hash') ||
      url.searchParams.get('token') ||
      url.searchParams.get('tokenHash');

    const type = url.searchParams.get('type') as
      | 'magiclink'
      | 'recovery'
      | 'invite'
      | 'signup'
      | 'email_change'
      | null;

    if (token_hash && type) {
      const { error } = await supa.auth.verifyOtp({ type, token_hash });
      if (error) {
        const err = encodeURIComponent(error.message || 'otp_verify_failed');
        return NextResponse.redirect(new URL(`/login?err=${err}&flow=otp`, url.origin));
      }

      // Pós-login: externo -> /menu ; admin/gestor -> /adm/dashboard (mesmo que venha next=/menu)
      const { data: u } = await supa.auth.getUser();
      const papel = (u.user?.user_metadata as any)?.app_role || (u.user?.user_metadata as any)?.papel || null;

      if (papel === 'admin' || papel === 'gestor') {
        return NextResponse.redirect(new URL('/adm/dashboard', url.origin));
      }

      return NextResponse.redirect(new URL(next, url.origin));
    }

    // Se chegou aqui sem token, tenta ver se já há sessão
    const { data } = await supa.auth.getSession();
    if (data.session) return NextResponse.redirect(new URL(next, url.origin));

    return NextResponse.redirect(new URL('/login?err=missing_code_or_token', url.origin));
  } catch (e: any) {
    const err = encodeURIComponent(e?.message || 'unknown_error');
    return NextResponse.redirect(new URL(`/login?err=${err}&flow=catch`, url.origin));
  }
}
