import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const handlers = new Map();
const shown = [];
const opened = [];
const worker = {
  addEventListener: (name, handler) => handlers.set(name, handler),
  location: { origin: 'https://soulpoetry.love' },
  registration: { showNotification: async (title, options) => shown.push({ title, ...options }) },
  clients: {
    matchAll: async () => [],
    openWindow: async (url) => opened.push(url),
    claim: async () => {},
  },
  skipWaiting: async () => {},
};
vm.runInNewContext(await readFile(new URL('../public/admin-push-sw.js', import.meta.url), 'utf8'), {
  self: worker,
  URL,
});
assert.equal(handlers.has('fetch'), false, 'worker must not intercept/cache private requests');
async function fire(name, event) {
  let task;
  handlers.get(name)({
    ...event,
    waitUntil: (promise) => {
      task = promise;
    },
  });
  await task;
}
await fire('push', {
  data: { json: () => ({ title: 'Test', body: 'Test', url: '/admin/recurring', tag: 'event-1' }) },
});
assert.equal(shown[0].data.url, '/admin/recurring');
assert.equal(shown[0].tag, 'event-1');
await fire('push', {
  data: {
    json: () => {
      throw new Error('bad json');
    },
  },
});
assert.equal(shown[1].title, 'SoulPoetry', 'malformed payload still produces visible notification');
await fire('push', { data: { json: () => ({ url: 'https://evil.test' }) } });
assert.equal(shown[2].data.url, '/admin/notifications');
const orderPath = '/admin/shop?tab=orders';
await fire('push', {
  data: {
    json: () => ({ title: 'Naujas užsakymas', url: orderPath, tag: 'shop-order-1' }),
  },
});
assert.equal(shown.at(-1).data.url, orderPath);
assert.equal(shown.at(-1).tag, 'shop-order-1');
const unsafePaths = [
  '//evil.test/a',
  'https://evil.test',
  '/api/auth/signout',
  '/admin/shop',
  '/admin/shop?tab=products',
  '/admin/shop?tab=orders&redirect=https://evil.test',
  '/admin/shop?tab=orders#other',
];
for (const url of unsafePaths) {
  await fire('push', { data: { json: () => ({ url }) } });
  assert.equal(shown.at(-1).data.url, '/admin/notifications', `reject unsafe push URL: ${url}`);
  await fire('notificationclick', { notification: { close() {}, data: { url } } });
  assert.equal(
    opened.at(-1),
    'https://soulpoetry.love/admin/notifications',
    `reject unsafe notification click URL: ${url}`,
  );
}
await fire('notificationclick', {
  notification: { close() {}, data: { url: '/admin/recurring' } },
});
assert.equal(opened.at(-1), 'https://soulpoetry.love/admin/recurring');
await fire('notificationclick', { notification: { close() {}, data: { url: orderPath } } });
assert.equal(opened.at(-1), `https://soulpoetry.love${orderPath}`);
const windowCount = opened.length;
for (const target of ['/admin/bookings', orderPath]) {
  let focused = false;
  worker.clients.matchAll = async () => [
    {
      url: 'https://soulpoetry.love/admin',
      navigate: async (url) => {
        assert.equal(url, `https://soulpoetry.love${target}`);
        return {
          focus: async () => {
            focused = true;
          },
        };
      },
    },
  ];
  await fire('notificationclick', { notification: { close() {}, data: { url: target } } });
  assert.ok(focused, `focus existing app for ${target}`);
  assert.equal(
    opened.length,
    windowCount,
    'reuse the existing app instead of opening a new window',
  );
}
console.log(
  'PASS: push-only worker, visible fallback, registration/order destinations, exact URL allowlist, existing app focus.',
);
