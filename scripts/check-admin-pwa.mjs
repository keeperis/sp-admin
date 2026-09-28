import assert from 'node:assert/strict';

// Read-only HTTP contract check, usable against a local production build or prod.
const base = new URL(process.argv[2] || 'http://localhost:3311');
let passed = 0;
const check = (label) => {
  passed += 1;
  console.log(`PASS ${label}`);
};
const get = (path) =>
  fetch(new URL(path, base), { redirect: 'manual', signal: AbortSignal.timeout(15_000) });

const login = await get('/login');
assert.equal(login.status, 200);
const loginHtml = await login.text();
const manifestLinks = loginHtml.match(/<link\b[^>]*rel="manifest"[^>]*>/g) || [];
assert.equal(manifestLinks.length, 1, 'login must declare exactly one manifest');
const manifestUrl = new URL(manifestLinks[0].match(/href="([^"]+)"/)[1], base);
assert.equal(manifestUrl.origin, base.origin);
assert.ok(
  /name="apple-mobile-web-app-capable" content="yes"/.test(loginHtml),
  'Apple standalone tag',
);
assert.ok(
  /name="apple-mobile-web-app-title" content="SoulPoetry Admin"/.test(loginHtml),
  'Apple application title',
);
assert.equal((loginHtml.match(/name="mobile-web-app-capable"/g) || []).length, 1);
assert.equal((loginHtml.match(/name="apple-mobile-web-app-capable"/g) || []).length, 1);
check('login serves installation metadata before authentication');

const manifestResponse = await get(manifestUrl);
assert.equal(manifestResponse.status, 200);
assert.match(manifestResponse.headers.get('content-type') || '', /application\/manifest\+json/);
const manifest = await manifestResponse.json();
assert.equal(manifest.display, 'standalone');
assert.equal(manifest.start_url, '/admin');
assert.equal(manifest.id, '/admin');
const scope = new URL(manifest.scope, manifestUrl);
for (const path of [manifest.start_url, '/login', '/api/auth/callback/google']) {
  const url = new URL(path, base);
  assert.equal(url.origin, scope.origin);
  assert.ok(url.pathname.startsWith(scope.pathname), `${path} must be in scope`);
}
check('public JSON manifest starts admin and includes the login/callback paths');

assert.ok(manifest.icons.some((icon) => icon.sizes === '192x192'));
assert.ok(manifest.icons.some((icon) => icon.sizes === '512x512'));
const appleTag = loginHtml.match(/<link\b[^>]*rel="apple-touch-icon"[^>]*>/)?.[0];
assert.ok(appleTag);
const applePath = appleTag.match(/href="([^"]+)"/)?.[1];
assert.ok(applePath);
for (const icon of [...manifest.icons, { src: applePath, sizes: '180x180' }]) {
  const url = new URL(icon.src, manifestUrl);
  assert.equal(url.origin, base.origin);
  const response = await get(url);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /^image\/png/);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  const dimensions = `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`;
  assert.equal(dimensions, icon.sizes);
  check(`public PNG ${url.pathname} (${dimensions})`);
}

const landing = await get('/');
assert.equal(landing.status, 200);
const landingHtml = await landing.text();
assert.ok(!/rel="manifest"|apple-mobile-web-app-capable|SoulPoetry Admin/.test(landingHtml));
check('public landing retains its non-admin identity');

for (const path of ['/admin', '/admin/recurring']) {
  const response = await get(path);
  assert.equal(response.status, 307);
  const target = new URL(response.headers.get('location'), base);
  assert.equal(target.origin, base.origin);
  assert.equal(target.pathname, '/login');
  assert.equal(target.searchParams.get('callbackUrl'), path);
  check(`unauthenticated ${path} still redirects to same-origin login`);
}

const api = await get('/api/admin/status');
assert.equal(api.status, 401);
check('admin API remains protected without a session');

const providers = await get('/api/auth/providers');
assert.equal(providers.status, 200);
const { google } = await providers.json();
assert.ok(google, 'Google login provider is still available');
const callback = new URL(google.callbackUrl);
assert.equal(callback.origin, base.origin);
assert.equal(callback.pathname, '/api/auth/callback/google');
check('Google OAuth callback remains same-origin');

console.log(`${passed}/${passed} HTTP contract checks passed. Real iPhone/OAuth QA is separate.`);
