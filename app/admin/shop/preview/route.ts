import { auth } from '@/lib/auth/config';
import { localDevelopmentAccess } from '@/lib/auth/local-development';
import { createAdminShopPreview } from '@/lib/shop/preview';

export const runtime = 'nodejs';
export function GET(request: Request) {
  return createAdminShopPreview(request, { session: auth, localAccess: localDevelopmentAccess });
}
