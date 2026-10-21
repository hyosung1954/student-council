
/* Student Council PWA automatic attendance v56; online-first HTML, offline fallback. No Supabase API data is cached here. */
const STATIC_CACHE = 'student-council-shell-v56';
const CDN_CACHE = 'student-council-vendor-v56';
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
      // Online-first for HTML so attendance policy changes are not stuck in old cache.
      if(request.mode==='navigate'||url.pathname.endsWith('/index.html')){
        try{
          const response=await fetch(new Request(request,{cache:'no-store'}));
          if(response.ok)await cache.put('./index.html',response.clone());
          return response;
        }catch(_){return (await cache.match('./index.html'))||Response.error();}
      }
      if(cached)return cached;
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
  let data = {title:'학생회 지도 알림',body:'학생회 알림이 도착했습니다.'};
  try {if(event.data)data={...data,...event.data.json()};}
  catch(_) {if(event.data)data.body=event.data.text();}
  event.waitUntil(self.registration.showNotification(data.title,{
    body:data.body,
    tag:data.tag||`council-${Date.now()}`,
    data:{url:data.url||'./'}
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target=new URL(event.notification.data?.url||'./',self.registration.scope).href;
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(async windows=>{
    for(const client of windows){
      if('focus' in client){
        try{if('navigate' in client)await client.navigate(target);}catch(_){}
        return client.focus();
      }
    }
    return clients.openWindow?clients.openWindow(target):undefined;
  }));
});
