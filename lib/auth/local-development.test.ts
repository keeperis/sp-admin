import assert from 'node:assert/strict';
import test from 'node:test';
import { localDevelopmentAccess } from './local-development';

test('local bypass requires opt-in, development, loopback host and local API', () => {
  const original = {
    NODE_ENV: process.env.NODE_ENV,
    LOCAL_ADMIN_NO_AUTH: process.env.LOCAL_ADMIN_NO_AUTH,
    API_BASE_URL: process.env.API_BASE_URL,
  };
  const request = new Request('http://127.0.0.1:3000/api/admin/shop/state', {
    headers: { host: '127.0.0.1:3000' },
  });
  try {
    Object.assign(process.env, {
      NODE_ENV: 'development',
      LOCAL_ADMIN_NO_AUTH: '1',
      API_BASE_URL: 'http://127.0.0.1:4100',
    });
    assert.equal(localDevelopmentAccess(request), true);
    Object.assign(process.env, { NODE_ENV: 'production' });
    assert.equal(localDevelopmentAccess(request), false);
    Object.assign(process.env, { NODE_ENV: 'development', LOCAL_ADMIN_NO_AUTH: '0' });
    assert.equal(localDevelopmentAccess(request), false);
    Object.assign(process.env, {
      LOCAL_ADMIN_NO_AUTH: '1',
      API_BASE_URL: 'https://api.example.com',
    });
    assert.equal(localDevelopmentAccess(request), false);
    Object.assign(process.env, { API_BASE_URL: 'http://127.0.0.1:4100' });
    assert.equal(
      localDevelopmentAccess(
        new Request('http://example.com/api/admin/shop/state', {
          headers: { host: 'example.com' },
        }),
      ),
      false,
    );
    assert.equal(
      localDevelopmentAccess(
        new Request(request.url, {
          headers: { host: '127.0.0.1:3000', 'x-forwarded-host': 'example.com' },
        }),
      ),
      false,
    );
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
