import type { NextRequest } from 'next/server';
import { proxyAdminApiRequest } from '@/lib/admin-api-proxy';

export async function GET(request: NextRequest) {
  return proxyAdminApiRequest(request, `/api/bookings${request.nextUrl.search}`);
}

export async function POST(request: NextRequest) {
  return proxyAdminApiRequest(request, '/api/admin/bookings');
}
