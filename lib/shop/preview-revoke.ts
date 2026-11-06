import { fixedServiceOrigin } from './preview-config';

type Dependencies = {
  env?: NodeJS.ProcessEnv;
  fetcher?: typeof fetch;
  reportFailure?: () => void;
};

// Logout must complete even if the shop API is unavailable. Preview sessions
// retain their independent, short expiry as the fallback in that case.
export async function revokeAdminShopPreviews(email: unknown, deps: Dependencies = {}) {
  if (typeof email !== 'string' || !email.trim()) return;
  const normalized = email.trim().toLowerCase();
  const env = deps.env || process.env;
  try {
    if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+$/.test(normalized))
      throw new Error('Invalid logout identity');
    const apiOrigin = fixedServiceOrigin(env.API_BASE_URL, env.NODE_ENV, 'http://127.0.0.1:4100');
    const token = env.INTERNAL_ADMIN_API_TOKEN;
    if (!token) throw new Error('Missing server authentication');
    const response = await (deps.fetcher || fetch)(
      new URL('/api/admin/shop/access/preview/revoke', apiOrigin),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Admin-Token': token,
          'X-Internal-Admin-Email': normalized,
        },
        body: '{}',
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(5000),
      },
    );
    await response.body?.cancel();
    if (!response.ok) throw new Error('Revocation was not confirmed');
  } catch {
    if (deps.reportFailure) deps.reportFailure();
    else console.error('[shop-preview] Logout revocation could not be confirmed.');
  }
}
