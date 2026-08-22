import type { NextRequest } from 'next/server';
import { proxyAdminApiRequest } from '@/lib/admin-api-proxy';

function buildTargetPath(request: NextRequest, path: string[]) {
  const normalized = path.map((segment) => encodeURIComponent(segment)).join('/');
  return `/api/admin/recurring/${normalized}${request.nextUrl.search}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyAdminApiRequest(request, buildTargetPath(request, path));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyAdminApiRequest(request, buildTargetPath(request, path), {
    maxBodyBytes: 64 * 1024,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyAdminApiRequest(request, buildTargetPath(request, path), {
    maxBodyBytes: 64 * 1024,
  });
}
