import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';

export default auth((request: NextRequest & { auth?: unknown }) => {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/admin/workshops')) {
    console.info('[sp-admin:middleware] admin workshops request', {
      method: request.method,
      pathname,
      search: request.nextUrl.search,
      hasAuth: Boolean(request.auth),
      origin: request.headers.get('origin') || '',
      contentType: request.headers.get('content-type') || '',
      requestedWith: request.headers.get('x-requested-with') || '',
      forwardedHost: request.headers.get('x-forwarded-host') || '',
      forwardedProto: request.headers.get('x-forwarded-proto') || '',
    });
  }

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
