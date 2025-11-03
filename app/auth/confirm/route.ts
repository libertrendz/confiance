import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '../../../lib/supabaseServer';

export async function GET(req: NextRequest) {
  const supa = getServerSupabase();
  const url = new URL(req.url);
  const next = url.searchParams.get('next') || '/menu';

  try {
    // Fluxo novo: ?code=...
    if (url.searchParams.has('code')) {
      // servidor espera a URL completa
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

    // Já tem sessão?
    const { data } = await supa.auth.getSession();
    if (data.session) return NextResponse.redirect(new URL(next, req.url));

    return NextResponse.redirect(new URL('/login', req.url));
  } catch (err) {
    console.error('Auth confirm error:', err);
    return NextResponse.redirect(new URL('/login', req.url));
  }
}
