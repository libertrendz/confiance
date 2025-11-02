// app/auth/confirm/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const next = url.searchParams.get('next') || '/menu';

  try {
    const supa = getServerSupabase();

    // Fluxo novo (?code=...) — usa a URL completa
    const hasCode = url.searchParams.has('code');
    if (hasCode) {
      const { error } = await supa.auth.exchangeCodeForSession(url.toString());
      if (error) {
        return NextResponse.redirect(new URL(`/login?err=${encodeURIComponent(error.message)}`, url.origin));
      }
      return NextResponse.redirect(new URL(next, url.origin));
    }

    // Fluxo antigo (token_hash + type)
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

    // Sem code/token: se já houver sessão ativa nos cookies, segue; senão volta ao login
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
