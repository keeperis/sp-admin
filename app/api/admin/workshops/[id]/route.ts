import { type NextRequest } from 'next/server';
import { proxyAdminApiRequest } from '@/lib/admin-api-proxy';

function targetPath(request: NextRequest, params: { id: string }) {
  const search = request.nextUrl.search || '';
  return `/api/workshops/${params.id}${search}`;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const params = await context.params;
  return proxyAdminApiRequest(request, targetPath(request, params));
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const params = await context.params;
  return proxyAdminApiRequest(request, targetPath(request, params));
}
