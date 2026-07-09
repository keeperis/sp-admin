import type { NextRequest } from 'next/server';
import { proxyMetaAdminRequest } from '@/lib/meta-admin-proxy';

export async function GET(request: NextRequest) {
  return proxyMetaAdminRequest(request, '/api/admin/meta/credentials/status');
}
