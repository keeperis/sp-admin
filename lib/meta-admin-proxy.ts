import { createHash, createHmac } from 'node:crypto';
import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4100';

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

function signaturePayload(
  timestamp: string,
  method: string,
  pathname: string,
  email: string,
  body: string,
): string {
  const bodyHash = createHash('sha256').update(body).digest('hex');
  return `${timestamp}\n${method}\n${pathname}\n${email}\n${bodyHash}`;
}

function mutationRequestIsSafe(request: NextRequest): boolean {
  if (request.method === 'GET' || request.method === 'HEAD') return true;
  const origin = request.headers.get('origin');
  const allowedOrigins = publicOriginCandidates(request);
  return (
    !!origin &&
    allowedOrigins.includes(origin) &&
    request.headers.get('x-requested-with') === 'XMLHttpRequest' &&
    request.headers.get('content-type')?.toLowerCase().startsWith('application/json') === true
  );
}

export async function proxyMetaAdminRequest(request: NextRequest, targetPath: string) {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized', code: 'NO_SESSION' }, { status: 401 });
  }
  if (!mutationRequestIsSafe(request)) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
  }

  const secret = process.env.INTERNAL_ADMIN_API_TOKEN;
  if (!secret) {
    return NextResponse.json({ error: 'Admin proxy secret is not configured' }, { status: 500 });
  }

  const body = request.method === 'GET' || request.method === 'HEAD' ? '' : await request.text();
  if (Buffer.byteLength(body, 'utf8') > 8 * 1024) {
    return NextResponse.json({ error: 'Request body is too large' }, { status: 413 });
  }

  const target = new URL(targetPath, API_BASE_URL);
  const timestamp = String(Date.now());
  const signature = createHmac('sha256', secret)
    .update(signaturePayload(timestamp, request.method, target.pathname, email, body))
    .digest('hex');
  const headers = new Headers({
    'content-type': 'application/json',
    'x-requested-with': 'XMLHttpRequest',
    'x-meta-admin-email': email,
    'x-meta-admin-timestamp': timestamp,
    'x-meta-admin-signature': signature,
  });

  const response = await fetch(target, {
    method: request.method,
    headers,
    body: body || undefined,
    cache: 'no-store',
  });
  const responseBody = await response.text();
  return new NextResponse(responseBody, {
    status: response.status,
    headers: {
      'content-type': response.headers.get('content-type') || 'application/json',
      'cache-control': 'no-store, private',
    },
  });
}
