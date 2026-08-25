import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/verify-phone',
  '/',
  '/map',
  '/chat',
  '/about',
  '/terms',
  '/privacy',
  '/safety',
  '/2257',
  '/takedown',
  '/content-removal',
  '/forgot-password',
  '/control', // control layout handles its own auth + maintenance gate
]

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1]
    if (!part) return null
    return JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, unknown>
  } catch {
    return null
  }
}

function isTokenValid(token: string): boolean {
  const payload = decodeJwtPayload(token)
  if (!payload || typeof payload['exp'] !== 'number') return false
  // 10-second buffer for clock skew
  return Date.now() / 1000 < payload['exp'] - 10
}

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl
  const accessToken = req.cookies.get('access_token')?.value
  const isAuthenticated = !!accessToken && isTokenValid(accessToken)

  const isPublic = PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))

  if (!isAuthenticated && !isPublic) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Unverified authenticated users always go to verify-phone (except legal static pages)
  if (isAuthenticated && pathname !== '/verify-phone') {
    const payload = decodeJwtPayload(accessToken)
    if (payload && payload['verified'] === false) {
      const ALLOW_UNVERIFIED = [
        '/about',
        '/terms',
        '/privacy',
        '/safety',
        '/2257',
        '/takedown',
        '/content-removal',
      ]
      const isLegalPage = ALLOW_UNVERIFIED.some(
        (r) => pathname === r || pathname.startsWith(r + '/'),
      )
      if (!isLegalPage) {
        return NextResponse.redirect(new URL('/verify-phone', req.url))
      }
    }
  }

  // Verified authenticated users skip auth pages
  if (isAuthenticated && (pathname === '/' || pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/map', req.url))
  }

  return NextResponse.next()
}

export const config = {
  // Anything containing a dot is a static asset — icon.svg, og.png, manifest.json,
  // sw.js, favicon.ico, apple-touch-icon.png. Browsers and link-preview crawlers
  // fetch those with no auth cookie, so matching them here 307'd every one of them
  // to '/' and served HTML where an image was expected: no favicon, no OG banner.
  matcher: ['/((?!_next/static|_next/image|api|.*\\.).*)'],
}
