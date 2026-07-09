import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4100';

function mutationRequestIsSafe(request: NextRequest) {
  if (request.method === 'GET' || request.method === 'HEAD') return true;
  return (
    request.headers.get('origin') === request.nextUrl.origin &&
    request.headers.get('x-requested-with') === 'XMLHttpRequest' &&
    request.headers.get('content-type')?.toLowerCase().startsWith('application/json') === true
  );
}

export async function proxyAdminApiRequest(
  request: NextRequest,
  targetPath: string,
  options: { maxBodyBytes?: number } = {},
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized', code: 'NO_SESSION' }, { status: 401 });
  }
  if (!mutationRequestIsSafe(request)) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
  }

  const internalToken = process.env.INTERNAL_ADMIN_API_TOKEN;
  if (!internalToken) {
    return NextResponse.json({ error: 'Admin proxy secret is not configured' }, { status: 500 });
  }

  const body = request.method === 'GET' || request.method === 'HEAD' ? '' : await request.text();
  if (Buffer.byteLength(body, 'utf8') > (options.maxBodyBytes || 16 * 1024)) {
    return NextResponse.json({ error: 'Request body is too large' }, { status: 413 });
  }

  const target = new URL(targetPath, API_BASE_URL);
  const response = await fetch(target, {
    method: request.method,
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Admin-Token': internalToken,
      'X-Internal-Admin-Email': session.user.email || 'unknown-admin',
    },
    body: body || undefined,
    cache: 'no-store',
  });

  return new NextResponse(await response.text(), {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') || 'application/json',
      'Cache-Control': 'no-store, private',
    },
  });
}
