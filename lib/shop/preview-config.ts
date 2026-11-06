export function fixedServiceOrigin(
  raw: string | undefined,
  environment: string | undefined,
  developmentDefault: string,
) {
  const value = raw?.trim() || (environment === 'development' ? developmentDefault : '');
  if (!value) throw new Error('Paslaugos adresas nesukonfigūruotas.');
  const url = new URL(value);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/' ||
    (url.protocol !== 'https:' &&
      !(environment === 'development' && loopback && url.protocol === 'http:'))
  )
    throw new Error('Netinkamas paslaugos adresas.');
  return url.origin;
}

export function shopPreviewStartUrl(returnTo?: string) {
  try {
    const origin = fixedServiceOrigin(
      process.env.NEXT_PUBLIC_SHOP_URL,
      process.env.NODE_ENV,
      'http://127.0.0.1:3004',
    );
    const start = new URL('/api/shop-preview/start', origin);
    if (returnTo !== undefined) {
      if (!returnTo.startsWith('/') || returnTo.startsWith('//') || /[\\\p{Cc}]/u.test(returnTo))
        return null;
      const target = new URL(returnTo, origin);
      if (target.origin !== origin) return null;
      start.searchParams.set('returnTo', `${target.pathname}${target.search}${target.hash}`);
    }
    return start.toString();
  } catch {
    return null;
  }
}

export function allowedAdminEmail(email: string, allowlist: string | undefined) {
  return (allowlist || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.trim().toLowerCase());
}

export function safeAdminCallback(value: unknown) {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\\\p{Cc}]/u.test(value)
  )
    return '/admin';
  try {
    const url = new URL(value, 'https://admin.invalid');
    if (
      url.origin !== 'https://admin.invalid' ||
      !(url.pathname === '/admin' || url.pathname.startsWith('/admin/'))
    )
      return '/admin';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/admin';
  }
}
