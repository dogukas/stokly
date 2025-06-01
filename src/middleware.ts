import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res })

  // Oturumu yenile ve kontrol et
  const { data: { session } } = await supabase.auth.getSession()

  // Korumalı rotalar
  const protectedRoutes = [
    '/dashboard',
    '/personnel-analysis',
    '/sales',
    '/stock',
    '/settings'
  ]

  // Giriş yapılmamışsa ve korumalı rotaya erişilmeye çalışılıyorsa
  if (!session && protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route))) {
    const redirectUrl = new URL('/auth/login', request.url)
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Giriş yapılmışsa ve auth sayfalarına erişilmeye çalışılıyorsa
  if (session && (request.nextUrl.pathname.startsWith('/auth/login') || request.nextUrl.pathname.startsWith('/auth/register'))) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
} 