import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/signup', '/verify-phone', '/']

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl
  const hasAccessToken = req.cookies.has('access_token')

  const isPublic = PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))

  if (!hasAccessToken && !isPublic) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (hasAccessToken && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/map', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
