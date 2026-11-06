import assert from 'node:assert/strict';
import test from 'node:test';
import { proxyAdminShopImage } from './admin-image';
import { createAdminShopPreview } from './preview';
import {
  allowedAdminEmail,
  fixedServiceOrigin,
  safeAdminCallback,
  shopPreviewStartUrl,
} from './preview-config';

const challenge = 'a'.repeat(64);
const code = 'b'.repeat(64);
const now = Date.now();
const expires = new Date(now + 60 * 60_000).toISOString();
const env: NodeJS.ProcessEnv = {
  NODE_ENV: 'production',
  NEXT_PUBLIC_SHOP_URL: 'https://shop.example.test',
  API_BASE_URL: 'https://api.example.test',
  INTERNAL_ADMIN_API_TOKEN: 'test-secret-never-exposed',
  ADMIN_EMAIL_ALLOWLIST: 'admin@example.test',
};
const request = (query = `challenge=${challenge}`) =>
  new Request(`https://admin.example.test/admin/shop/preview?${query}`);
const session = async () => ({ user: { email: 'Admin@Example.Test' }, expires });
const noFetch = async (): Promise<Response> => {
  assert.fail('Upstream must not be contacted');
};
const deps = { env, session, localAccess: () => false, fetcher: noFetch, now: () => now };

test('product preview links keep the start endpoint and carry the product path as a safe return target', () => {
  const original = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SHOP_URL: process.env.NEXT_PUBLIC_SHOP_URL,
  };
  try {
    Object.assign(process.env, {
      NODE_ENV: 'production',
      NEXT_PUBLIC_SHOP_URL: 'https://shop.example.test',
    });
    const path = `/dirbiniai/${encodeURIComponent('ryto-puodelis')}`;
    const url = new URL(shopPreviewStartUrl(path)!);
    assert.equal(url.origin, 'https://shop.example.test');
    assert.equal(url.pathname, '/api/shop-preview/start');
    assert.equal(url.searchParams.get('returnTo'), '/dirbiniai/ryto-puodelis');
    assert.equal(shopPreviewStartUrl(), 'https://shop.example.test/api/shop-preview/start');
    for (const value of [
      'https://evil.test',
      '//evil.test',
      '/\\evil.test',
      '/dirbiniai/\ninvalid',
    ])
      assert.equal(shopPreviewStartUrl(value), null);
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('preview destinations use fixed HTTPS origins and only explicit development permits loopback HTTP', () => {
  assert.equal(
    fixedServiceOrigin('https://shop.example.test/', 'production', ''),
    'https://shop.example.test',
  );
  assert.equal(
    fixedServiceOrigin(undefined, 'development', 'http://127.0.0.1:3004'),
    'http://127.0.0.1:3004',
  );
  for (const value of [
    undefined,
    'http://shop.example.test',
    'http://localhost:3004',
    'javascript:alert(1)',
    'https://user:pass@shop.example.test',
    'https://shop.example.test/path',
    'https://shop.example.test/?next=evil',
    'https://shop.example.test/#code',
  ])
    assert.throws(() => fixedServiceOrigin(value, 'production', 'http://127.0.0.1:3004'));
  assert.throws(() => fixedServiceOrigin('http://public.example.test', 'development', ''));
});

test('login return accepts admin-relative paths but rejects external and ambiguous destinations', () => {
  const callback = `/admin/shop/preview?challenge=${challenge}`;
  assert.equal(safeAdminCallback(callback), callback);
  assert.equal(safeAdminCallback('/admin/shop'), '/admin/shop');
  for (const value of [
    undefined,
    [callback],
    '//evil.test',
    'https://evil.test',
    '/\\evil.test',
    '/admin/../../evil',
    '/admin\n/preview',
    '/api/auth/signout',
  ])
    assert.equal(safeAdminCallback(value), '/admin');
  assert.equal(
    allowedAdminEmail(' ADMIN@EXAMPLE.TEST ', 'other@test.example,admin@example.test'),
    true,
  );
  assert.equal(allowedAdminEmail('removed@example.test', env.ADMIN_EMAIL_ALLOWLIST), false);
});

test('invalid preview challenges fail before auth and unauthenticated requests preserve the return flow', async () => {
  for (const query of [
    '',
    'challenge=abc',
    `challenge=${challenge}&challenge=${challenge}`,
    `challenge=${'G'.repeat(64)}`,
  ]) {
    const response = await createAdminShopPreview(request(query), {
      ...deps,
      session: async () => {
        assert.fail('Invalid challenge must not resolve a session');
      },
    });
    assert.equal(response.status, 400);
  }
  const response = await createAdminShopPreview(request(), { ...deps, session: async () => null });
  assert.equal(response.status, 303);
  const target = new URL(response.headers.get('location')!, 'https://admin.example.test');
  assert.equal(target.origin, 'https://admin.example.test');
  assert.equal(target.pathname, '/login');
  assert.equal(
    target.searchParams.get('callbackUrl'),
    `/admin/shop/preview?challenge=${challenge}`,
  );
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.match(response.headers.get('cache-control')!, /no-store/);
});

test('expired and revoked admin sessions cannot mint preview grants', async () => {
  const expired = await createAdminShopPreview(request(), {
    ...deps,
    session: async () => ({
      user: { email: 'admin@example.test' },
      expires: new Date(now - 1).toISOString(),
    }),
  });
  assert.equal(expired.status, 303);
  const revoked = await createAdminShopPreview(request(), {
    ...deps,
    env: { ...env, ADMIN_EMAIL_ALLOWLIST: 'replacement@example.test' },
  });
  assert.equal(revoked.status, 403);
});

test('preview grant binds authenticated identity, session expiry and configured audience, ignoring redirect inputs', async () => {
  let calls = 0;
  const response = await createAdminShopPreview(
    request(`challenge=${challenge}&audience=https://evil.test&returnTo=https://evil.test`),
    {
      ...deps,
      fetcher: async (url, options) => {
        calls++;
        assert.equal(String(url), 'https://api.example.test/api/admin/shop/access/preview');
        assert.equal(options?.method, 'POST');
        assert.equal(options?.redirect, 'error');
        assert.equal(options?.cache, 'no-store');
        const headers = new Headers(options?.headers);
        assert.equal(headers.get('x-internal-admin-token'), env.INTERNAL_ADMIN_API_TOKEN);
        assert.equal(headers.get('x-internal-admin-email'), 'admin@example.test');
        assert.deepEqual(JSON.parse(String(options?.body)), {
          challenge,
          audience: 'https://shop.example.test',
          sessionExpiresAt: expires,
        });
        return Response.json({ code, expiresAt: new Date(now + 60_000).toISOString() });
      },
    },
  );
  assert.equal(calls, 1);
  assert.equal(response.status, 303);
  assert.equal(
    response.headers.get('location'),
    `https://shop.example.test/api/shop-preview/callback?code=${code}`,
  );
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.match(response.headers.get('cache-control')!, /no-store/);
  assert.equal(await response.text(), '');
  assert.equal(
    JSON.stringify([...response.headers]).includes(env.INTERNAL_ADMIN_API_TOKEN!),
    false,
  );
});

test('invalid grants, redirects and upstream failures never leak provider response or secrets', async () => {
  for (const issued of [
    { code: 'https://evil.test', expiresAt: expires },
    { code, expiresAt: new Date(now - 1).toISOString() },
    { code, expiresAt: new Date(now + 2 * 60 * 60_000).toISOString() },
    { code, expiresAt: 'invalid' },
  ]) {
    const response = await createAdminShopPreview(request(), {
      ...deps,
      fetcher: async () => Response.json(issued),
    });
    assert.equal(response.status, 502);
    assert.equal(response.headers.get('location'), null);
  }
  const failed = await createAdminShopPreview(request(), {
    ...deps,
    fetcher: async () => {
      throw new Error(env.INTERNAL_ADMIN_API_TOKEN);
    },
  });
  assert.equal(failed.status, 503);
  assert.equal((await failed.text()).includes(env.INTERNAL_ADMIN_API_TOKEN!), false);
});

test('admin image proxy blocks anonymous, revoked, expired and malformed requests', async () => {
  const imageRequest = new Request('https://admin.example.test/api/shop/demo/mug');
  assert.equal(
    (await proxyAdminShopImage(imageRequest, 'demo', 'mug', { ...deps, session: async () => null }))
      .status,
    401,
  );
  assert.equal(
    (
      await proxyAdminShopImage(imageRequest, 'demo', 'mug', {
        ...deps,
        env: { ...env, ADMIN_EMAIL_ALLOWLIST: '' },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await proxyAdminShopImage(imageRequest, 'demo', 'mug', {
        ...deps,
        session: async () => ({
          user: { email: 'admin@example.test' },
          expires: new Date(now - 1).toISOString(),
        }),
      })
    ).status,
    401,
  );
  assert.equal((await proxyAdminShopImage(imageRequest, 'demo', '../access', deps)).status, 404);
  assert.equal(
    (await proxyAdminShopImage(imageRequest, 'media', '123?admin=true', deps)).status,
    404,
  );
});

test('admin image proxy forwards identity only to its fixed API and always returns private bytes', async () => {
  const id = 'c'.repeat(24);
  const response = await proxyAdminShopImage(
    new Request(`https://admin.example.test/api/shop/media/${id}`),
    'media',
    id,
    {
      ...deps,
      fetcher: async (url, options) => {
        assert.equal(String(url), `https://api.example.test/api/shop/media/${id}`);
        assert.equal(options?.redirect, 'error');
        assert.equal(
          new Headers(options?.headers).get('x-internal-admin-email'),
          'admin@example.test',
        );
        return new Response(new Uint8Array([1, 2, 3]), {
          headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000' },
        });
      },
    },
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/webp');
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), new Uint8Array([1, 2, 3]));
  const html = await proxyAdminShopImage(
    new Request('https://admin.example.test/api/shop/demo/mug'),
    'demo',
    'mug',
    {
      ...deps,
      fetcher: async () =>
        new Response('<script>secret</script>', { headers: { 'Content-Type': 'text/html' } }),
    },
  );
  assert.equal(html.status, 502);
  assert.equal(await html.text(), '');
});
