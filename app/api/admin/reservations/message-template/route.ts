import type { NextRequest } from 'next/server';
import { proxyAdminApiRequest } from '@/lib/admin-api-proxy';

function targetPath(request: NextRequest) {
  return `/api/admin/reservations/message-template${request.nextUrl.search}`;
}

export async function GET(request: NextRequest) {
  return proxyAdminApiRequest(request, targetPath(request));
}

export async function PUT(request: NextRequest) {
  return proxyAdminApiRequest(request, targetPath(request));
}
