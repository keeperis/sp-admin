import type { NextRequest } from 'next/server';
import { proxyAdminApiRequest } from '@/lib/admin-api-proxy';

async function proxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyAdminApiRequest(
    request,
    `/api/admin/shop/${path.map(encodeURIComponent).join('/')}`,
    { maxBodyBytes: 12 * 1024 * 1024 },
  );
}
export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
