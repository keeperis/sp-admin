import type { NextRequest } from 'next/server';
import { proxyAdminApiRequest } from '@/lib/admin-api-proxy';

function targetPath(request: NextRequest) {
  return `/api/admin/legal${request.nextUrl.search}`;
}

export async function GET(request: NextRequest) {
  return proxyAdminApiRequest(request, targetPath(request));
}

export async function PATCH(request: NextRequest) {
  return proxyAdminApiRequest(request, targetPath(request), { maxBodyBytes: 256 * 1024 });
}
