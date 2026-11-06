import { safeAdminCallback } from '@/lib/shop/preview-config';
import { LoginForm } from './LoginForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  return <LoginForm callbackUrl={safeAdminCallback((await searchParams).callbackUrl)} />;
}
