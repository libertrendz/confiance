// app/auth/confirm/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getServerSupabase } from '../../../lib/supabaseServer'; // <-- relativo, sem '@/'

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const next = url.searchParams.get('next') || '/menu';

  try {
    const supa = getServerSupabase();

    // 1) Fluxo moderno (?code=...) usando a URL completa
    if (url.searchParams.has('code')) {
      const { error } = await supa.auth.exchangeCodeForSession(url.toString());
      if (error) {
        return NextResponse.redirect(new URL(`/login?err=${encodeURIComponent(error.message)}`, url.origin));
      }
      return NextResponse.redirect(new URL(next, url.origin));
    }

    // 2) Fluxo antigo (token_hash + type)
    const token_hash =
      url.searchParams.get('token_hash') ||
      url.searchParams.get('token') ||
      url.searchParams.get('tokenHash');

    const type = url.searchParams.get('type') as
      | 'magiclink' | 'recovery' | 'invite' | 'signup' | 'email_change' | null;

    if (token_hash && type) {
      const { error } = await supa.auth.verifyOtp({ type, token_hash });
      if (error) {
        return NextResponse.redirect(new URL(`/login?err=${encodeURIComponent(error.message)}`, url.origin));
      }
      return NextResponse.redirect(new URL(next, url.origin));
    }

    // 3) Sem code/token: se já existir sessão nos cookies, segue; senão, volta ao login
    const { data } = await supa.auth.getSession();
    if (data.session) {
      return NextResponse.redirect(new URL(next, url.origin));
    }

    return NextResponse.redirect(new URL('/login?err=missing_code', url.origin));
  } catch (e: any) {
    const msg = e?.message || 'erro_desconhecido';
    return NextResponse.redirect(new URL(`/login?err=${encodeURIComponent(msg)}`, req.nextUrl.origin));
  }
}
