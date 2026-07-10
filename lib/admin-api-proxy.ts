import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4100';

function apiBaseOrigin() {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return 'invalid API_BASE_URL';
  }
}

function publicOriginCandidates(request: NextRequest): string[] {
  const candidates = new Set<string>([request.nextUrl.origin]);
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const forwardedHost = request.headers.get('x-forwarded-host');
  if (forwardedProto && forwardedHost) {
    candidates.add(`${forwardedProto}://${forwardedHost}`);
  }
  const host = request.headers.get('host');
  if (forwardedProto && host) {
    candidates.add(`${forwardedProto}://${host}`);
  }
  return [...candidates];
}

function mutationRequestIsSafe(request: NextRequest) {
  if (request.method === 'GET' || request.method === 'HEAD') return true;
  const origin = request.headers.get('origin');
  const allowedOrigins = publicOriginCandidates(request);
  const contentType = request.headers.get('content-type')?.toLowerCase() || '';
  const contentLength = Number(request.headers.get('content-length') || '0');
  const hasBody = Number.isFinite(contentLength) ? contentLength > 0 : false;
  return (
    !!origin &&
    allowedOrigins.includes(origin) &&
    request.headers.get('x-requested-with') === 'XMLHttpRequest' &&
    (!hasBody || contentType.startsWith('application/json'))
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

  let target: URL;
  try {
    target = new URL(targetPath, API_BASE_URL);
  } catch {
    return NextResponse.json(
      {
        error: 'Admin API proxy is misconfigured: API_BASE_URL is invalid.',
        code: 'ADMIN_API_BASE_URL_INVALID',
        details: { targetPath, apiBaseOrigin: apiBaseOrigin() },
      },
      { status: 500 },
    );
  }

  let response: Response;
  try {
    response = await fetch(target, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Admin-Token': internalToken,
        'X-Internal-Admin-Email': session.user.email || 'unknown-admin',
      },
      body: body || undefined,
      cache: 'no-store',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Admin API proxy could not reach sp-api. Check API_BASE_URL in sp-admin production.',
        code: 'ADMIN_API_UPSTREAM_UNREACHABLE',
        details: {
          targetPath,
          apiBaseOrigin: apiBaseOrigin(),
          message: error instanceof Error ? error.message : String(error),
        },
      },
      { status: 502 },
    );
  }

  const responseText = await response.text();
  const responseContentType = response.headers.get('content-type') || '';

  if (!responseContentType.toLowerCase().includes('application/json')) {
    return NextResponse.json(
      {
        error:
          'Admin API proxy received a non-JSON response from sp-api. This usually means API_BASE_URL points to the wrong app or the production deploy is stale.',
        code: 'ADMIN_API_UPSTREAM_NON_JSON',
        details: {
          targetPath,
          apiBaseOrigin: apiBaseOrigin(),
          upstreamStatus: response.status,
          upstreamContentType: responseContentType || 'missing',
        },
      },
      { status: response.ok ? 502 : response.status },
    );
  }

  return new NextResponse(responseText, {
    status: response.status,
    headers: {
      'Content-Type': responseContentType,
      'Cache-Control': 'no-store, private',
    },
  });
}
