import { privatePreviewHeaders } from './preview';
import { allowedAdminEmail, fixedServiceOrigin } from './preview-config';

type Dependencies = {
  session: () => Promise<{ user?: { email?: string | null }; expires?: string } | null>;
  localAccess: (request: Request) => boolean;
  env?: NodeJS.ProcessEnv;
  fetcher?: typeof fetch;
};

export async function proxyAdminShopImage(
  request: Request,
  kind: 'media' | 'demo',
  id: string,
  deps: Dependencies,
) {
  const fail = (status: number) => new Response(null, { status, headers: privatePreviewHeaders });
  if (
    kind === 'media'
      ? !/^[a-f0-9]{24}$/.test(id)
      : !['mug', 'bowl', 'vase', 'incense', 'studio'].includes(id)
  )
    return fail(404);
  const env = deps.env || process.env;
  try {
    const local = deps.localAccess(request);
    const session = local ? null : await deps.session();
    const email = local
      ? 'local-development@localhost'
      : session?.user?.email?.trim().toLowerCase();
    if (!email) return fail(401);
    if (
      !local &&
      (!Number.isFinite(Date.parse(session?.expires || '')) ||
        Date.parse(session!.expires!) <= Date.now())
    )
      return fail(401);
    if (!local && !allowedAdminEmail(email, env.ADMIN_EMAIL_ALLOWLIST)) return fail(403);
    if (!env.INTERNAL_ADMIN_API_TOKEN) return fail(503);
    const apiOrigin = fixedServiceOrigin(env.API_BASE_URL, env.NODE_ENV, 'http://127.0.0.1:4100');
    const upstream = await (deps.fetcher || fetch)(new URL(`/api/shop/${kind}/${id}`, apiOrigin), {
      headers: {
        'X-Internal-Admin-Token': env.INTERNAL_ADMIN_API_TOKEN,
        'X-Internal-Admin-Email': email,
      },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(20_000),
    });
    const contentType = upstream.headers.get('content-type')?.split(';')[0].trim();
    if (
      !upstream.ok ||
      !contentType ||
      !['image/webp', 'image/png', 'image/jpeg', 'image/avif'].includes(contentType)
    ) {
      await upstream.body?.cancel();
      return fail([401, 403, 404].includes(upstream.status) ? upstream.status : 502);
    }
    return new Response(upstream.body, {
      headers: {
        ...privatePreviewHeaders,
        'Content-Type': contentType,
        'Content-Security-Policy': "default-src 'none'",
      },
    });
  } catch {
    return fail(503);
  }
}
