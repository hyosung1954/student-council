
/* Student Council PWA v52: fresh HTML online, offline shell when disconnected. */
const STATIC_CACHE = 'student-council-shell-v52';
const CDN_CACHE = 'student-council-vendor-v52';
const SHELL = ['./index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
const VENDORS = [
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await Promise.all(SHELL.map(path => cache.add(new Request(path, {cache:'reload'})).catch(err => console.warn('Shell cache:',path,err))));
    const vendors = await caches.open(CDN_CACHE);
    await Promise.all(VENDORS.map(url => vendors.add(url).catch(err => console.warn('Vendor cache:',url,err))));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k =>
      (k.startsWith('student-council-shell-') && k !== STATIC_CACHE) ||
      (k.startsWith('student-council-vendor-') && k !== CDN_CACHE)
    ).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  // Never cache Supabase API responses, credentials, or private records.
  if(url.hostname.endsWith('.supabase.co')) return;
  if(url.origin === self.location.origin) {
    if(!url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
    // Online-first for the app document: always show deployed fixes when connected.
    if(req.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
      event.respondWith((async () => {
        const cache = await caches.open(STATIC_CACHE);
        try {
          const fresh = await fetch(new Request(req, {cache:'no-store'}));
          if(fresh.ok) await cache.put('./index.html',fresh.clone());
          return fresh;
        } catch(err) {
          return (await cache.match('./index.html')) || Response.error();
        }
      })());
      return;
    }
    event.respondWith((async () => {
      const cache = await caches.open(STATIC_CACHE);
      const hit = await cache.match(req,{ignoreSearch:true});
      if(hit) return hit;
      const response = await fetch(req);
      if(response.ok) await cache.put(req,response.clone());
      return response;
    })());
    return;
  }
  const allowed = ['cdn.jsdelivr.net','cdn.tailwindcss.com','cdnjs.cloudflare.com','fonts.googleapis.com','fonts.gstatic.com'];
  if(!allowed.includes(url.hostname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CDN_CACHE);
    const hit = await cache.match(req);
    if(hit) return hit;
    const response = await fetch(req);
    if(response.ok || response.type === 'opaque') await cache.put(req,response.clone());
    return response;
  })());
});
self.addEventListener('push', event => {
  let data = {title:'학생회 지도 알림',body:'학생회 알림이 도착했습니다.'};
  try { if(event.data) data = {...data,...event.data.json()}; }
  catch(_) { if(event.data) data.body = event.data.text(); }
  event.waitUntil(self.registration.showNotification(data.title,{
    body:data.body,
    tag:data.tag || `council-${Date.now()}`,
    data:{url:data.url || './'}
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || './',self.registration.scope).href;
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(async windows => {
    for(const client of windows) {
      if('focus' in client) {
        try { if('navigate' in client) await client.navigate(target); } catch(_) {}
        return client.focus();
      }
    }
    return clients.openWindow ? clients.openWindow(target) : undefined;
  }));
});
