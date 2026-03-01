import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4100';

export async function POST(request: NextRequest) {
  const target = new URL('/api/admin/content/translate', API_BASE_URL);
  const body = await request.text();

  const res = await fetch(target, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-internal-admin-token': process.env.INTERNAL_ADMIN_API_TOKEN || '',
    },
    body,
    cache: 'no-store',
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
  });
}
