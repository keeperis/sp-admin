import type { NextRequest } from 'next/server';
import { proxyAdminApiRequest } from '@/lib/admin-api-proxy';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyAdminApiRequest(
    request,
    `/api/admin/bookings/${encodeURIComponent(id)}/resend-confirmation`,
  );
}
