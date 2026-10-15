
/* Student Council PWA offline shell v49. No Supabase API data is cached here. */
const STATIC_CACHE = 'student-council-shell-v49';
const CDN_CACHE = 'student-council-vendor-v49';
const SHELL = ['./index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
const VENDORS = [
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];
self.addEventListener('install', event => {
  event.waitUntil((async()=>{
    const cache=await caches.open(STATIC_CACHE);
    await Promise.all(SHELL.map(url=>cache.add(new Request(url,{cache:'reload'})).catch(e=>console.warn('Shell cache skipped:',url,e))));
    const vendorCache=await caches.open(CDN_CACHE);
    await Promise.all(VENDORS.map(url=>vendorCache.add(url).catch(e=>console.warn('Vendor cache skipped:',url,e))));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>(k.startsWith('student-council-shell-')&&k!==STATIC_CACHE)||(k.startsWith('student-council-vendor-')&&k!==CDN_CACHE)).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  // Never cache authenticated Supabase requests, or personal information in SW cache.
  if(url.hostname.endsWith('.supabase.co'))return;
  if(url.origin===self.location.origin){
    if(!url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
    event.respondWith((async()=>{
      const cache=await caches.open(STATIC_CACHE);
      const cached=await cache.match(request,{ignoreSearch:true});
      // Offline-first: avoid downloading the full HTML on every launch.
      if(cached)return cached;
      if(request.mode==='navigate'){
        const fallback=await cache.match('./index.html');
        if(fallback)return fallback;
      }
      const response=await fetch(request);
      if(response.ok)await cache.put(request,response.clone());
      return response;
    })());
    return;
  }
  const allowed=['cdn.jsdelivr.net','cdn.tailwindcss.com','cdnjs.cloudflare.com','fonts.googleapis.com','fonts.gstatic.com'];
  if(!allowed.includes(url.hostname))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CDN_CACHE);
    const hit=await cache.match(request);
    if(hit)return hit;
    const response=await fetch(request);
    if(response.ok||response.type==='opaque')await cache.put(request,response.clone());
    return response;
  })());
});
self.addEventListener('push', event => {
  let data = { title: '학생회 지도 알림', body: '내일 지도 일정이 있습니다.' };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch (_) {}
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    tag: data.tag || 'guide-reminder',
    renotify: false,
    data: { url: data.url || './' }
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || './', self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const client of list) { if ('focus' in client) { client.navigate(target); return client.focus(); } }
    return clients.openWindow ? clients.openWindow(target) : undefined;
  }));
});

