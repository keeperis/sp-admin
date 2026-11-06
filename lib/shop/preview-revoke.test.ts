import assert from 'node:assert/strict';
import test from 'node:test';
import { revokeAdminShopPreviews } from './preview-revoke';

const env: NodeJS.ProcessEnv = {
  NODE_ENV: 'production',
  API_BASE_URL: 'https://api.example.test',
  INTERNAL_ADMIN_API_TOKEN: 'test-secret',
};

test('logout revokes the authenticated email through the fixed API without exposing it in the URL', async () => {
  let calls = 0;
  await revokeAdminShopPreviews(' Admin@Example.Test ', {
    env,
    reportFailure: () => assert.fail('Revocation should succeed'),
    fetcher: async (url, options) => {
      calls++;
      assert.equal(String(url), 'https://api.example.test/api/admin/shop/access/preview/revoke');
      assert.equal(options?.method, 'POST');
      assert.equal(options?.body, '{}');
      assert.equal(options?.cache, 'no-store');
      assert.equal(options?.redirect, 'error');
      assert.ok(options?.signal);
      const headers = new Headers(options?.headers);
      assert.equal(headers.get('x-internal-admin-token'), env.INTERNAL_ADMIN_API_TOKEN);
      assert.equal(headers.get('x-internal-admin-email'), 'admin@example.test');
      return Response.json({ revoked: true });
    },
  });
  assert.equal(calls, 1);
});

test('logout remains successful when revocation fails and reports only a generic failure signal', async () => {
  let reports = 0;
  for (const fetcher of [
    async () => new Response('private provider diagnostics', { status: 503 }),
    async () => {
      throw new Error('token=test-secret; admin=admin@example.test');
    },
  ]) {
    await assert.doesNotReject(
      revokeAdminShopPreviews('admin@example.test', {
        env,
        fetcher,
        reportFailure: (...args: unknown[]) => {
          assert.deepEqual(args, []);
          reports++;
        },
      }),
    );
  }
  assert.equal(reports, 2);
});

test('logout skips absent JWT identities and cannot send credentials to an insecure API', async () => {
  let reports = 0;
  const fetcher = async (): Promise<Response> => {
    assert.fail('The API must not be contacted');
  };
  for (const email of [undefined, null, '', '   '])
    await revokeAdminShopPreviews(email, { env, fetcher, reportFailure: () => reports++ });
  assert.equal(reports, 0);
  for (const changed of [
    { API_BASE_URL: 'http://api.example.test' },
    { API_BASE_URL: 'https://secret@api.example.test' },
    { INTERNAL_ADMIN_API_TOKEN: '' },
  ])
    await revokeAdminShopPreviews('admin@example.test', {
      env: { ...env, ...changed },
      fetcher,
      reportFailure: () => reports++,
    });
  assert.equal(reports, 3);
});
