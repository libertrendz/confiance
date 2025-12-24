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
    // ✅ Fluxo compatível (multi-dispositivo): token_hash + type
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

    // Se veio um link antigo/estranho sem os params corretos:
    // NÃO joga erro feio na UI — só manda pro login.
    if (!token_hash || !type) {
      return NextResponse.redirect(new URL('/login', url.origin));
    }

    const { error } = await supa.auth.verifyOtp({ type, token_hash });
    if (error) {
      // Também não polui UI com erro técnico
      return NextResponse.redirect(new URL('/login', url.origin));
    }

    // Decide destino por papel (admin/gestor => dashboard; externo => menu).
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
          return NextResponse.redirect(new URL('/adm/dashboard', url.origin));
        }
        return NextResponse.redirect(new URL('/menu', url.origin));
      }
    } catch {
      // ignora
    }

    // fallback
    return NextResponse.redirect(new URL(next, url.origin));
  } catch {
    // sem erro técnico visível
    return NextResponse.redirect(new URL('/login', req.url));
  }
}