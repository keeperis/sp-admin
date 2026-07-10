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

function diagnosticHeaders(extra: Record<string, string | number | undefined> = {}) {
  const headers = new Headers({
    'Cache-Control': 'no-store, private',
    'X-SP-Admin-Proxy': 'hit',
    'X-SP-Admin-API-Origin': apiBaseOrigin(),
  });
  for (const [key, value] of Object.entries(extra)) {
    if (value !== undefined) headers.set(key, String(value));
  }
  return headers;
}

function diagnosticJson(
  body: Record<string, unknown>,
  init: { status: number; headers?: Record<string, string | number | undefined> },
) {
  return NextResponse.json(body, {
    status: init.status,
    headers: diagnosticHeaders(init.headers),
  });
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
  console.info('[sp-admin:admin-api-proxy] request received', {
    method: request.method,
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    targetPath,
    apiBaseOrigin: apiBaseOrigin(),
    origin: request.headers.get('origin') || '',
    contentType: request.headers.get('content-type') || '',
    requestedWith: request.headers.get('x-requested-with') || '',
  });

  const session = await auth();
  if (!session?.user?.email) {
    console.warn('[sp-admin:admin-api-proxy] unauthorized request', {
      method: request.method,
      pathname: request.nextUrl.pathname,
      targetPath,
    });
    return diagnosticJson(
      { error: 'Unauthorized', code: 'NO_SESSION' },
      { status: 401, headers: { 'X-SP-Admin-Proxy-Stage': 'auth' } },
    );
  }
  if (!mutationRequestIsSafe(request)) {
    console.warn('[sp-admin:admin-api-proxy] csrf validation failed', {
      method: request.method,
      pathname: request.nextUrl.pathname,
      targetPath,
      origin: request.headers.get('origin') || '',
      contentType: request.headers.get('content-type') || '',
      requestedWith: request.headers.get('x-requested-with') || '',
      allowedOrigins: publicOriginCandidates(request),
    });
    return diagnosticJson(
      { error: 'CSRF validation failed', code: 'ADMIN_API_CSRF_FAILED' },
      { status: 403, headers: { 'X-SP-Admin-Proxy-Stage': 'csrf' } },
    );
  }

  const internalToken = process.env.INTERNAL_ADMIN_API_TOKEN;
  if (!internalToken) {
    console.error('[sp-admin:admin-api-proxy] internal admin token missing', {
      method: request.method,
      pathname: request.nextUrl.pathname,
      targetPath,
    });
    return diagnosticJson(
      { error: 'Admin proxy secret is not configured', code: 'ADMIN_PROXY_TOKEN_MISSING' },
      { status: 500, headers: { 'X-SP-Admin-Proxy-Stage': 'config' } },
    );
  }

  const body = request.method === 'GET' || request.method === 'HEAD' ? '' : await request.text();
  if (Buffer.byteLength(body, 'utf8') > (options.maxBodyBytes || 16 * 1024)) {
    console.warn('[sp-admin:admin-api-proxy] body too large', {
      method: request.method,
      pathname: request.nextUrl.pathname,
      targetPath,
      bodyBytes: Buffer.byteLength(body, 'utf8'),
      maxBodyBytes: options.maxBodyBytes || 16 * 1024,
    });
    return diagnosticJson(
      { error: 'Request body is too large', code: 'ADMIN_API_BODY_TOO_LARGE' },
      { status: 413, headers: { 'X-SP-Admin-Proxy-Stage': 'body' } },
    );
  }

  let target: URL;
  try {
    target = new URL(targetPath, API_BASE_URL);
  } catch {
    console.error('[sp-admin:admin-api-proxy] invalid API_BASE_URL', {
      method: request.method,
      pathname: request.nextUrl.pathname,
      targetPath,
      apiBaseOrigin: apiBaseOrigin(),
    });
    return diagnosticJson(
      {
        error: 'Admin API proxy is misconfigured: API_BASE_URL is invalid.',
        code: 'ADMIN_API_BASE_URL_INVALID',
        details: { targetPath, apiBaseOrigin: apiBaseOrigin() },
      },
      { status: 500, headers: { 'X-SP-Admin-Proxy-Stage': 'target-url' } },
    );
  }

  let response: Response;
  try {
    console.info('[sp-admin:admin-api-proxy] forwarding upstream', {
      method: request.method,
      targetPath,
      targetOrigin: target.origin,
    });
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
    console.error('[sp-admin:admin-api-proxy] upstream unreachable', {
      method: request.method,
      targetPath,
      apiBaseOrigin: apiBaseOrigin(),
      message: error instanceof Error ? error.message : String(error),
    });
    return diagnosticJson(
      {
        error: 'Admin API proxy could not reach sp-api. Check API_BASE_URL in sp-admin production.',
        code: 'ADMIN_API_UPSTREAM_UNREACHABLE',
        details: {
          targetPath,
          apiBaseOrigin: apiBaseOrigin(),
          message: error instanceof Error ? error.message : String(error),
        },
      },
      { status: 502, headers: { 'X-SP-Admin-Proxy-Stage': 'upstream-fetch' } },
    );
  }

  const responseText = await response.text();
  const responseContentType = response.headers.get('content-type') || '';

  console.info('[sp-admin:admin-api-proxy] upstream response', {
    method: request.method,
    targetPath,
    upstreamStatus: response.status,
    upstreamContentType: responseContentType || 'missing',
    responseBytes: Buffer.byteLength(responseText, 'utf8'),
  });

  if (!responseContentType.toLowerCase().includes('application/json')) {
    console.error('[sp-admin:admin-api-proxy] upstream returned non-json', {
      method: request.method,
      targetPath,
      apiBaseOrigin: apiBaseOrigin(),
      upstreamStatus: response.status,
      upstreamContentType: responseContentType || 'missing',
      responsePreview: responseText.slice(0, 160),
    });
    return diagnosticJson(
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
      {
        status: response.ok ? 502 : response.status,
        headers: {
          'X-SP-Admin-Proxy-Stage': 'upstream-content-type',
          'X-SP-Admin-Upstream-Status': response.status,
        },
      },
    );
  }

  const headers = diagnosticHeaders({
    'Content-Type': responseContentType,
    'X-SP-Admin-Proxy-Stage': 'upstream-json',
    'X-SP-Admin-Upstream-Status': response.status,
  });

  return new NextResponse(responseText, {
    status: response.status,
    headers,
  });
}
