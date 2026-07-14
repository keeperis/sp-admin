import type { NextRequest } from 'next/server';
import { proxyAdminApiRequest } from '@/lib/admin-api-proxy';

export async function GET(request: NextRequest) {
  return proxyAdminApiRequest(request, `/api/admin/bank-transfer${request.nextUrl.search}`);
}

export async function PATCH(request: NextRequest) {
  return proxyAdminApiRequest(request, `/api/admin/bank-transfer${request.nextUrl.search}`);
}
