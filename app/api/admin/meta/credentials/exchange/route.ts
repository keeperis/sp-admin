import type { NextRequest } from 'next/server';
import { proxyMetaAdminRequest } from '@/lib/meta-admin-proxy';

export async function POST(request: NextRequest) {
  return proxyMetaAdminRequest(request, '/api/admin/meta/credentials/exchange');
}
