import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';

export default auth((request: NextRequest & { auth?: unknown }) => {
  const { pathname } = request.nextUrl;

  // Protect admin API routes
  if (pathname.startsWith('/api/admin') && !request.auth) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'NO_SESSION', hint: 'Prisijunk prie admin puslapio' },
      { status: 401 },
    );
  }

  // Protect /admin routes
  if (pathname.startsWith('/admin') && !request.auth) {
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
