const CACHE_NAME = 'student-council-v2-20260930';
const CORE = ['./', './manifest.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(CORE))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();

    await Promise.all(
      keys
        .filter(k => k !== CACHE_NAME)
        .map(k => caches.delete(k))
    );

    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(
          event.request,
          { cache: 'no-store' }
        );

        const cache = await caches.open(CACHE_NAME);
        cache.put('./', fresh.clone());

        return fresh;
      } catch (_) {
        return (
          await caches.match(event.request)
        ) || (
          await caches.match('./')
        );
      }
    })());

    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
  );
});

self.addEventListener('push', event => {
  let data = {};

  try {
    data = event.data
      ? event.data.json()
      : {};
  } catch (_) {
    data = {
      body: event.data?.text() || ''
    };
  }

  event.waitUntil(
    self.registration.showNotification(
      data.title || '학생회 알림',
      {
        body: data.body || '',
        tag: data.tag || 'student-council',

        data: {
          url: data.url || './'
        },

        icon: './icon-192.png',
        badge: './icon-192.png',
      }
    )
  );
});

self.addEventListener(
  'notificationclick',
  event => {
    event.notification.close();

    const target = new URL(
      event.notification.data?.url || './',
      self.location.href
    ).href;

    event.waitUntil((async () => {
      const clientsList =
        await clients.matchAll({
          type: 'window',
          includeUncontrolled: true
        });

      for (const client of clientsList) {
        if ('focus' in client) {
          await client.focus();

          if ('navigate' in client) {
            await client.navigate(target);
          }

          return;
        }
      }

      if (clients.openWindow) {
        await clients.openWindow(target);
      }
    })());
  }
);
