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
  return proxyAdminApiRequest(request, await targetPath(request, params));
}

export async function PATCH(request: NextRequest, { params }: WorkshopProxyRouteProps) {
  return proxyAdminApiRequest(request, await targetPath(request, params), {
    maxBodyBytes: 256 * 1024,
  });
}

export async function DELETE(request: NextRequest, { params }: WorkshopProxyRouteProps) {
  return proxyAdminApiRequest(request, await targetPath(request, params));
}
