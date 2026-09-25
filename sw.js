const CACHE='watermonitor-v19';
self.addEventListener('install',e=>{self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!=='watermonitor-v19').map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{let c=r.clone();caches.open('watermonitor-v19').then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request)))});
