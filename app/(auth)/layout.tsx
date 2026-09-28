import type { Metadata, Viewport } from 'next';
import { adminAppMetadata, adminAppViewport } from '@/lib/admin-app';

// /admin redirects here before login, so installation metadata must also be public.
export const metadata: Metadata = adminAppMetadata;
export const viewport: Viewport = adminAppViewport;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
