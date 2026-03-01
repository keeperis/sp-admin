import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4100';

async function proxy(request: NextRequest) {
  const target = new URL('/api/admin/bg-grid', API_BASE_URL);
  target.search = new URL(request.url).search;

  const res = await fetch(target, {
    method: request.method,
    headers: {
      'content-type': 'application/json',
      'x-internal-admin-token': process.env.INTERNAL_ADMIN_API_TOKEN || '',
    },
    body: request.method === 'GET' ? undefined : await request.text(),
    cache: 'no-store',
  });

  return new NextResponse(await res.text(), {
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
