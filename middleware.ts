import NextAuth from 'next-auth';
import authConfig from '@/auth.config';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth(function middleware(req: NextRequest & { auth: unknown }) {
  const { pathname, searchParams } = req.nextUrl;
  const isAuthenticated = !!(req as { auth: unknown }).auth;

  // Protect all /(portal) routes
  const isPortalRoute =
    pathname.startsWith('/ideas') ||
    pathname.startsWith('/admin');

  if (isPortalRoute && !isAuthenticated) {
    const returnUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('returnUrl', returnUrl);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/ideas/:path*',
    '/admin/:path*',
  ],
};
