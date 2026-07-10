import type { NextRequest } from 'next/server';
import { proxyAdminApiRequest } from '@/lib/admin-api-proxy';

interface WorkshopProxyRouteProps {
  params: Promise<{ id: string }>;
}

async function targetPath(request: NextRequest, params: Promise<{ id: string }>) {
  const { id } = await params;
  const search = request.nextUrl.search || '';
  return `/api/workshops/${encodeURIComponent(id)}${search}`;
}

export async function GET(request: NextRequest, { params }: WorkshopProxyRouteProps) {
  const target = await targetPath(request, params);
  console.info('[sp-admin:workshops-id-route] GET hit', {
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    targetPath: target,
  });
  return proxyAdminApiRequest(request, target);
}

export async function PATCH(request: NextRequest, { params }: WorkshopProxyRouteProps) {
  const target = await targetPath(request, params);
  console.info('[sp-admin:workshops-id-route] PATCH hit', {
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    targetPath: target,
  });
  return proxyAdminApiRequest(request, target, {
    maxBodyBytes: 256 * 1024,
  });
}

export async function DELETE(request: NextRequest, { params }: WorkshopProxyRouteProps) {
  const target = await targetPath(request, params);
  console.info('[sp-admin:workshops-id-route] DELETE hit', {
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    targetPath: target,
  });
  return proxyAdminApiRequest(request, target);
}
