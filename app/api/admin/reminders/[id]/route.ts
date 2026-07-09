import type { NextRequest } from 'next/server';
import { proxyAdminApiRequest } from '@/lib/admin-api-proxy';

interface ReminderProxyRouteProps {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: ReminderProxyRouteProps) {
  const { id } = await params;
  return proxyAdminApiRequest(request, `/api/admin/reminders/${encodeURIComponent(id)}`);
}
