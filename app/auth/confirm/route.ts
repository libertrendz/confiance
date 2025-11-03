// app/auth/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';

export async function GET(req: NextRequest) {
  const supa = getServerSupabase();
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const token_hash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  const next = url.searchParams.get('next') || '/menu';

  try {
    if (code) {
      const { error } = await supa.auth.exchangeCodeForSession(code);
      if (error) throw error;
      return NextResponse.redirect(new URL(next, req.url));
    }

    if (token_hash && type) {
      const { error } = await supa.auth.verifyOtp({ type, token_hash });
      if (error) throw error;
      return NextResponse.redirect(new URL(next, req.url));
    }

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

