// middleware.ts
import { NextResponse, NextRequest } from 'next/server'

const PROTECTED = [/^\/menu$/, /^\/adm(\/.*)?$/]

export function middleware(req: NextRequest) {
  const url = new URL(req.url)
  const isProtected = PROTECTED.some((re) => re.test(url.pathname))

  // sessão mínima: cookie do sb + anon key pública já setada no build
  const hasSbSession =
    req.cookies.has('sb-access-token') || req.cookies.has('sb:token')

  if (isProtected && !hasSbSession) {
    const next = encodeURIComponent(url.pathname + url.search)
    return NextResponse.redirect(new URL(`/login?next=${next}`, req.url))
  }

  // evita ir pra /login se já estiver logado
  if (url.pathname === '/login' && hasSbSession) {
    const next = url.searchParams.get('next') || '/menu'
    return NextResponse.redirect(new URL(next, req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|assets|favicon.ico|robots.txt|sitemap.xml).*)'],
}
