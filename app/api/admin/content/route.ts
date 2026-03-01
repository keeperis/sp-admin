import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4100';

function buildTargetUrl(request: NextRequest) {
  const url = new URL(request.url);
  const target = new URL('/api/admin/content', API_BASE_URL);
  target.search = url.search;
  return target;
}

async function proxy(request: NextRequest) {
  const target = buildTargetUrl(request);
  const headers = new Headers();
  headers.set('x-internal-admin-token', process.env.INTERNAL_ADMIN_API_TOKEN || '');
  headers.set('content-type', 'application/json');

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: 'no-store',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.text();
  }

  const res = await fetch(target, init);
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
  });
}

export async function GET(request: NextRequest) {
  return proxy(request);
}

export async function PATCH(request: NextRequest) {
  return proxy(request);
}
