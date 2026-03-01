import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4100';

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const target = new URL('/api/admin/bg-grid/upload', API_BASE_URL);

  const res = await fetch(target, {
    method: 'POST',
    headers: {
      'x-internal-admin-token': process.env.INTERNAL_ADMIN_API_TOKEN || '',
    },
    body: form,
    cache: 'no-store',
  });

  return new NextResponse(await res.text(), {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
  });
}
