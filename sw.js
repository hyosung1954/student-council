self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', event => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {
      body: event.data ? event.data.text() : ''
    };
  }

  const target = new URL(
    data.url || './',
    self.registration.scope
  ).href;

  event.waitUntil(
    self.registration.showNotification(
      data.title || '학생회 지도 알림',
      {
        body: data.body || '',
        tag: data.tag || 'guide-reminder',
        data: { url: target }
      }
    )
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const target =
    event.notification.data?.url ||
    self.registration.scope;

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(async windows => {
      for (const client of windows) {
        if ('navigate' in client) {
          await client.navigate(target);
        }

        if ('focus' in client) {
          return client.focus();
        }
      }

      return clients.openWindow(target);
    })
  );
});
