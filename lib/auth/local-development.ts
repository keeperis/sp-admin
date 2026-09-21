// Explicitly opt-in, development-only and loopback-only. Never enabled in next start/build.
export function localDevelopmentAccess(request: Request): boolean {
  if (process.env.NODE_ENV !== 'development' || process.env.LOCAL_ADMIN_NO_AUTH !== '1')
    return false;
  const loopback = (value: string) => {
    try {
      return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(`http://${value}`).hostname);
    } catch {
      return false;
    }
  };
  const forwarded = request.headers.get('x-forwarded-host');
  try {
    if (!loopback(new URL(process.env.API_BASE_URL || 'http://localhost:4100').host)) return false;
  } catch {
    return false;
  }
  return (
    loopback(new URL(request.url).host) &&
    loopback(request.headers.get('host') || '') &&
    (!forwarded || loopback(forwarded))
  );
}
