import { allowedAdminEmail, fixedServiceOrigin } from './preview-config';

type PreviewSession = { user?: { email?: string | null }; expires?: string } | null;
type Dependencies = {
  session: () => Promise<PreviewSession>;
  localAccess: (request: Request) => boolean;
  env?: NodeJS.ProcessEnv;
  fetcher?: typeof fetch;
  now?: () => number;
};
export const privatePreviewHeaders = {
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
};

function error(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: privatePreviewHeaders });
}

export async function createAdminShopPreview(request: Request, deps: Dependencies) {
  const query = new URL(request.url).searchParams;
  const challenge = query.get('challenge');
  if (query.getAll('challenge').length !== 1 || !challenge || !/^[a-f0-9]{64}$/.test(challenge))
    return error('Peržiūros nuoroda netinkama. Pradėk iš parduotuvės valdymo.', 400);
  const env = deps.env || process.env;
  const now = (deps.now || Date.now)();
  try {
    const shopOrigin = fixedServiceOrigin(
      env.NEXT_PUBLIC_SHOP_URL,
      env.NODE_ENV,
      'http://127.0.0.1:3004',
    );
    const apiOrigin = fixedServiceOrigin(env.API_BASE_URL, env.NODE_ENV, 'http://127.0.0.1:4100');
    const local = deps.localAccess(request);
    const session = local
      ? {
          user: { email: 'local-development@localhost' },
          expires: new Date(now + 60 * 60_000).toISOString(),
        }
      : await deps.session();
    const email = session?.user?.email?.trim().toLowerCase();
    const sessionEnd = Date.parse(session?.expires || '');
    if (!email || !Number.isFinite(sessionEnd) || sessionEnd <= now) {
      const callback = `/admin/shop/preview?challenge=${challenge}`;
      return new Response(null, {
        status: 303,
        headers: {
          ...privatePreviewHeaders,
          Location: `/login?callbackUrl=${encodeURIComponent(callback)}`,
        },
      });
    }
    if (!local && !allowedAdminEmail(email, env.ADMIN_EMAIL_ALLOWLIST))
      return error('Ši paskyra nebeturi parduotuvės administravimo prieigos.', 403);
    const token = env.INTERNAL_ADMIN_API_TOKEN;
    if (!token) return error('Parduotuvės peržiūra dar nesukonfigūruota.', 503);
    const response = await (deps.fetcher || fetch)(
      new URL('/api/admin/shop/access/preview', apiOrigin),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Admin-Token': token,
          'X-Internal-Admin-Email': email,
        },
        body: JSON.stringify({
          challenge,
          audience: shopOrigin,
          sessionExpiresAt: session!.expires,
        }),
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(20_000),
      },
    );
    if (!response.ok) {
      await response.body?.cancel();
      return error(
        'Nepavyko suteikti parduotuvės peržiūros prieigos. Bandyk dar kartą.',
        response.status === 403 ? 403 : 502,
      );
    }
    const issued = await response.json();
    const expires =
      typeof issued?.expiresAt === 'string' ? Date.parse(issued.expiresAt) : Number.NaN;
    if (
      typeof issued?.code !== 'string' ||
      !/^[a-f0-9]{64}$/.test(issued.code) ||
      !Number.isFinite(expires) ||
      expires <= now ||
      expires > sessionEnd
    )
      return error('Nepavyko patvirtinti parduotuvės peržiūros prieigos.', 502);
    const target = new URL('/api/shop-preview/callback', shopOrigin);
    target.searchParams.set('code', issued.code);
    return new Response(null, {
      status: 303,
      headers: { ...privatePreviewHeaders, Location: target.toString() },
    });
  } catch {
    return error('Parduotuvės peržiūra šiuo metu nepasiekiama. Bandyk dar kartą.', 503);
  }
}
