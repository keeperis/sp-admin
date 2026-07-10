import type { NextRequest } from 'next/server';
import { proxyAdminApiRequest } from '@/lib/admin-api-proxy';

function targetPath(request: NextRequest) {
  const search = request.nextUrl.search || '';
  return `/api/workshops${search}`;
}

export async function GET(request: NextRequest) {
  return proxyAdminApiRequest(request, targetPath(request));
}

export async function POST(request: NextRequest) {
  return proxyAdminApiRequest(request, targetPath(request), { maxBodyBytes: 256 * 1024 });
}
