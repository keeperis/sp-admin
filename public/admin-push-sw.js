// Push-only: never intercept requests or cache admin data, auth or API responses.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

const allowedPaths = new Set(['/admin/bookings', '/admin/recurring', '/admin/notifications']);
function safePath(value) {
  return allowedPaths.has(value) ? value : '/admin/notifications';
}
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data?.json() || {};
  } catch {
    /* Still show a visible notification. */
  }
  event.waitUntil(
    self.registration.showNotification(
      typeof payload.title === 'string' ? payload.title.slice(0, 120) : 'SoulPoetry',
      {
        body:
          typeof payload.body === 'string'
            ? payload.body.slice(0, 240)
            : 'Naujas pranešimas administravime.',
        icon: '/icons/admin-192.png',
        badge: '/icons/admin-192.png',
        tag: typeof payload.tag === 'string' ? payload.tag.slice(0, 150) : 'soulpoetry',
        data: { url: safePath(payload.url) },
      },
    ),
  );
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(safePath(event.notification.data?.url), self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windows) {
        const url = new URL(client.url);
        if (
          url.origin === self.location.origin &&
          (url.pathname === '/admin' || url.pathname.startsWith('/admin/'))
        ) {
          const navigated = await client.navigate(target);
          if (navigated) return navigated.focus();
        }
      }
      return self.clients.openWindow(target);
    })(),
  );
});
