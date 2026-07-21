import type { NextRequest } from 'next/server';
import { proxyAdminApiRequest } from '@/lib/admin-api-proxy';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyAdminApiRequest(request, `/api/bookings/${encodeURIComponent(id)}`);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyAdminApiRequest(request, `/api/bookings/${encodeURIComponent(id)}`);
}
