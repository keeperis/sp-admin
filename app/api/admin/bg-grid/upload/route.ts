import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4100';

export async function POST(request: NextRequest) {
  try {
    const target = new URL('/api/admin/bg-grid/upload', API_BASE_URL);
    const contentType = request.headers.get('content-type') || 'multipart/form-data';
    const rawBody = await request.arrayBuffer();

    const res = await fetch(target, {
      method: 'POST',
      headers: {
        'x-internal-admin-token': process.env.INTERNAL_ADMIN_API_TOKEN || '',
        'content-type': contentType,
      },
      body: rawBody,
      cache: 'no-store',
    });

    return new NextResponse(await res.text(), {
      status: res.status,
      headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Upload proxy failed' },
      { status: 500 },
    );
  }
}
