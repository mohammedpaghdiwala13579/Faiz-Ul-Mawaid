// sw.js — HTML is NEVER cached. Always served fresh from network.
// CACHE_NAME is auto-replaced on every deploy by GitHub Actions — never edit manually.
const CACHE_NAME = 'chattogram-BUILD_HASH';
const STATIC_ASSETS = [
  'manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim()).then(() => {
      // Tell every open tab to reload so they get fresh HTML immediately
      return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        clients.forEach(client => client.postMessage({ type: 'SW_ACTIVATED' }));
      });
    })
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // HTML — always fetch from network, never cache
  const isHTML = request.mode === 'navigate' ||
                 request.destination === 'document' ||
                 url.pathname === '/' ||
                 url.pathname.endsWith('.html');
  if (isHTML) {
    event.respondWith(
      fetch(request, { cache: 'no-store' }).catch(() => caches.match('index.html'))
    );
    return;
  }

  // sw.js itself — always fetch fresh so new versions are never blocked
  if (url.pathname.endsWith('sw.js')) {
    event.respondWith(fetch(request, { cache: 'no-store' }));
    return;
  }

  // Static assets — cache first
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});
