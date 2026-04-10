/* ══════════════════════════════════════════════════════
   NEURALMA — Service Worker v1
   Cachea todo en install, sirve desde cache primero.
   Actualiza en background cuando hay nueva versión.
══════════════════════════════════════════════════════ */
const CACHE='nm-v8';
const ASSETS=[
  './',
  './index.html',
  'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Bebas+Neue&family=DM+Sans:wght@400;500;600&display=swap',
  'https://fonts.gstatic.com/s/bebasneue/v14/JTUSjIg69CK48gW7PXooxW5rygbi49c.woff2',
  'https://fonts.gstatic.com/s/spacemono/v13/i7dPIFZifjKcF5UAWdDRUEZ2RFq7AwU.woff2',
];

// Install: cache all assets
self.addEventListener('install',e=>{
  e.waitUntil(
    caches.open(CACHE)
      .then(c=>c.addAll(ASSETS).catch(()=>{})) // fail gracefully if fonts not available
      .then(()=>self.skipWaiting())
  );
});

// Activate: delete old caches
self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(keys=>
      Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))
    ).then(()=>self.clients.claim())
  );
});

// Fetch: cache-first for assets, network-first for API calls
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);

  // Never cache Apps Script calls
  if(url.hostname.includes('script.google')){
    e.respondWith(fetch(e.request).catch(()=>new Response('{}',{headers:{'Content-Type':'application/json'}})));
    return;
  }

  // Cache-first for everything else
  e.respondWith(
    caches.match(e.request).then(cached=>{
      if(cached) return cached;
      return fetch(e.request).then(response=>{
        // Cache successful GET responses
        if(e.request.method==='GET'&&response.status===200){
          const clone=response.clone();
          caches.open(CACHE).then(c=>c.put(e.request,clone));
        }
        return response;
      }).catch(()=>{
        // Offline fallback: return index.html for navigation requests
        if(e.request.mode==='navigate'){
          return caches.match('./index.html');
        }
      });
    })
  );
});
