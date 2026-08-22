import { headers } from 'next/headers';

import { WelcomeLanding } from '@/src/components/welcome/WelcomeLanding';

export const dynamic = 'force-dynamic';

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function isLocalUrl(value: string) {
  try {
    const { hostname } = new URL(value);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
}

function getProtocol(forwardedProto: string | null, host: string | null) {
  if (forwardedProto === 'http' || forwardedProto === 'https') {
    return forwardedProto;
  }

  return host?.includes('localhost') ? 'http' : 'https';
}

function getFallbackAppUrl(
  app: 'ceramics' | 'yoga',
  host: string | null,
  protocol: 'http' | 'https',
) {
  if (host === 'pp.soulpoetry.love') {
    return `${protocol}://${app === 'ceramics' ? 'keramika-pp' : 'yoga-pp'}.soulpoetry.love`;
  }

  if (host === 'soulpoetry.love' || host === 'www.soulpoetry.love') {
    return `${protocol}://${app === 'ceramics' ? 'keramika' : 'yoga'}.soulpoetry.love`;
  }

  return `${protocol}://localhost:${app === 'ceramics' ? '3001' : '3002'}`;
}

function resolveAppUrl(
  configured: string | undefined,
  fallbackApp: 'ceramics' | 'yoga',
  host: string | null,
  protocol: 'http' | 'https',
) {
  if (configured && !isLocalUrl(configured)) {
    return trimTrailingSlash(configured);
  }

  if (process.env.NODE_ENV === 'development' && configured) {
    return trimTrailingSlash(configured);
  }

  return getFallbackAppUrl(fallbackApp, host, protocol);
}

export default async function RootPage() {
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host');
  const protocol = getProtocol(requestHeaders.get('x-forwarded-proto'), host);

  const ceramicsUrl = resolveAppUrl(process.env.CERAMICS_APP_URL, 'ceramics', host, protocol);
  const yogaUrl = resolveAppUrl(process.env.YOGA_APP_URL, 'yoga', host, protocol);

  return <WelcomeLanding ceramicsUrl={ceramicsUrl} yogaUrl={yogaUrl} />;
}
