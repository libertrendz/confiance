// app/auth/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

type Papel = 'admin' | 'gestor' | 'externo';

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

async function redirectByRole(req: NextRequest, nextCandidate: string) {
  const supa = getServerSupabase();

  // sessão já deve existir aqui (cookies gravados)
  const { data: ud } = await supa.auth.getUser();
  const uid = ud.user?.id ?? null;

  // fallback seguro
  let papel: Papel = 'externo';

  if (uid) {
    const { data: prof } = await supa
      .from('profiles')
      .select('papel')
      .eq('user_id', uid)
      .maybeSingle();

    const db = (prof as any)?.papel;
    if (db === 'admin' || db === 'gestor' || db === 'externo') papel = db;
  } else {
    // Se não conseguiu ler user, vai pro login limpo
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // regra de negócio: externo->menu | admin/gestor->adm/dashboard
  if (papel === 'admin' || papel === 'gestor') {
    return NextResponse.redirect(new URL('/adm/dashboard', req.url));
  }

  // externo: respeita nextCandidate se for interno, senão /menu
  const safe = sanitizeNext(nextCandidate);
  return NextResponse.redirect(new URL(safe || '/menu', req.url));
}

export async function GET(req: NextRequest) {
  const supa = getServerSupabase();
  const url = new URL(req.url);
  const nextRaw = url.searchParams.get('next');
  const next = sanitizeNext(nextRaw);

  try {
    // 1) Fluxo PKCE/OAuth: ?code=...
    const code =
      url.searchParams.get('code') ||
      url.searchParams.get('verification_code');

    if (code) {
      const { error } = await supa.auth.exchangeCodeForSession(code);
      if (error) {
        const err = encodeURIComponent(error.message || 'code_exchange_failed');
        return NextResponse.redirect(new URL(`/login?err=${err}`, req.url));
      }
      return await redirectByRole(req, next);
    }

    // 2) Fluxo OTP: token_hash + type
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
        return NextResponse.redirect(new URL(`/login?err=${err}`, req.url));
      }
      return await redirectByRole(req, next);
    }

    // 3) Sem params: se já existe sessão, redireciona pela role
    const { data } = await supa.auth.getSession();
    if (data.session) {
      return await redirectByRole(req, next);
    }

    // 4) Nada útil
    return NextResponse.redirect(new URL('/login?err=missing_code_or_token', req.url));
  } catch (e: any) {
    const err = encodeURIComponent(e?.message || 'unknown_error');
    return NextResponse.redirect(new URL(`/login?err=${err}`, req.url));
  }
}
