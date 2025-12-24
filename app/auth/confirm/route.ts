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

async function redirectByRoleOrNext(supa: any, origin: string, next: string) {
  try {
    const { data: u } = await supa.auth.getUser();
    const uid = u.user?.id;
    if (uid) {
      const { data: prof } = await supa
        .from('profiles')
        .select('papel')
        .eq('user_id', uid)
        .maybeSingle();

      const papel = (prof as any)?.papel as string | undefined;
      if (papel === 'admin' || papel === 'gestor') {
        return NextResponse.redirect(new URL('/adm/dashboard', origin));
      }
      return NextResponse.redirect(new URL('/menu', origin));
    }
  } catch {
    // ignora
  }

  return NextResponse.redirect(new URL(next, origin));
}

export async function GET(req: NextRequest) {
  const supa = getServerSupabase();
  const url = new URL(req.url);

  const next = sanitizeNext(url.searchParams.get('next'));
  const origin = url.origin;

  try {
    // 1) ✅ Fluxo CODE (PKCE) — quando o Supabase/verify redireciona com ?code=
    const code = url.searchParams.get('code') || url.searchParams.get('verification_code');
    if (code) {
      const { error } = await supa.auth.exchangeCodeForSession(code);

      if (error) {
        // Se o link foi aberto num dispositivo/aba onde não existe code_verifier, a sessão não pode ser criada.
        // Mantemos UX limpa: volta para login com erro "silenciável".
        const msg = (error.message || '').toLowerCase();
        const err =
          msg.includes('code verifier') || msg.includes('both auth code')
            ? 'link_invalido_ou_aberto_em_outro_dispositivo'
            : error.message || 'code_exchange_failed';

        return NextResponse.redirect(new URL(`/login?err=${encodeURIComponent(err)}`, origin));
      }

      return await redirectByRoleOrNext(supa, origin, next);
    }

    // 2) ✅ Fluxo token_hash + type (OTP)
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
        return NextResponse.redirect(
          new URL(`/login?err=${encodeURIComponent(error.message || 'otp_verify_failed')}`, origin)
        );
      }

      return await redirectByRoleOrNext(supa, origin, next);
    }

    // 3) Se já tem sessão nos cookies
    const { data } = await supa.auth.getSession();
    if (data.session) {
      return await redirectByRoleOrNext(supa, origin, next);
    }

    return NextResponse.redirect(new URL('/login?err=missing_code_or_token', origin));
  } catch (e: any) {
    return NextResponse.redirect(new URL(`/login?err=${encodeURIComponent(e?.message || 'unknown_error')}`, origin));
  }
}
