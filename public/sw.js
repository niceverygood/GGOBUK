// Minimal service worker for PWA install + future push handling.
const CACHE = 'kkobuk-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/']).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Network-first for HTML and API; cache-first for static.
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api') || event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
  }
});

// Web push handler.
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const payload = (() => {
    try { return event.data.json(); } catch { return { title: '꼬북점', body: event.data.text() }; }
  })();
  event.waitUntil(
    self.registration.showNotification(payload.title || '꼬북점', {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: payload.url ? { url: payload.url } : undefined,
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/home';
  event.waitUntil(self.clients.openWindow(target));
});
