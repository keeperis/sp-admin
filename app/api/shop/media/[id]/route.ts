import { auth } from '@/lib/auth/config';
import { localDevelopmentAccess } from '@/lib/auth/local-development';
import { proxyAdminShopImage } from '@/lib/shop/admin-image';

export const runtime = 'nodejs';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return proxyAdminShopImage(request, 'media', (await params).id, {
    session: auth,
    localAccess: localDevelopmentAccess,
  });
}
