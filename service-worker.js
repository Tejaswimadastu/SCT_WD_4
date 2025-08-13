const cacheName="focusdo-v1";
const filesToCache=["/","index.html","style.css","app.js","manifest.json"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(cacheName).then(c=>c.addAll(filesToCache)));self.skipWaiting();});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==cacheName).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener("fetch",e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{const copy=res.clone();caches.open(cacheName).then(c=>c.put(e.request,copy));return res;})).catch(()=>caches.match("index.html")));});
