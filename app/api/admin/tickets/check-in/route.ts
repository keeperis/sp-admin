import type { NextRequest } from 'next/server';
import { proxyAdminApiRequest } from '@/lib/admin-api-proxy';

export async function POST(request: NextRequest) {
  return proxyAdminApiRequest(request, '/api/admin/tickets/check-in', { maxBodyBytes: 4096 });
}
