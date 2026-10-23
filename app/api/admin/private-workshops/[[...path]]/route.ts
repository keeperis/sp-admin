import type { NextRequest } from 'next/server';
import { proxyAdminApiRequest } from '@/lib/admin-api-proxy';

type Context = { params: Promise<{ path?: string[] }> };

async function proxy(request: NextRequest, context: Context) {
  const { path = [] } = await context.params;
  const suffix = path.length ? `/${path.map(encodeURIComponent).join('/')}` : '';
  return proxyAdminApiRequest(
    request,
    `/api/admin/private-workshops${suffix}${request.nextUrl.search}`,
    {
      maxBodyBytes: 256 * 1024,
    },
  );
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
