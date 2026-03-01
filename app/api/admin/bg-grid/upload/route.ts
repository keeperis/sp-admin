import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4100';

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const site = String(form.get('site') || '');
    const file = form.get('file');
    if (!(file instanceof File) || (site !== 'ceramics' && site !== 'yoga')) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const target = new URL('/api/admin/bg-grid/upload-json', API_BASE_URL);

    const res = await fetch(target, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-internal-admin-token': process.env.INTERNAL_ADMIN_API_TOKEN || '',
      },
      body: JSON.stringify({
        site,
        filename: file.name,
        mimeType: file.type,
        base64: buf.toString('base64'),
      }),
      cache: 'no-store',
    });

    return new NextResponse(await res.text(), {
      status: res.status,
      headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Upload proxy failed' }, { status: 500 });
  }
}
