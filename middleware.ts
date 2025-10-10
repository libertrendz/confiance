// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED = ['/menu','/adm','/perfil','/ponto'];

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const path = url.pathname;

  const hasAccess = req.cookies.has('sb-access-token'); // Supabase Auth cookie
  const wantsLogin = path === '/login';

  // se não logado e pedindo rota protegida -> /login
  if (!hasAccess && PROTECTED.some(p => path === p || path.startsWith(p + '/'))) {
    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('next', path);
    return NextResponse.redirect(redirectUrl);
  }

  // se logado e foi para /login -> manda para /menu
  if (hasAccess && wantsLogin) {
    return NextResponse.redirect(new URL('/menu', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
};
