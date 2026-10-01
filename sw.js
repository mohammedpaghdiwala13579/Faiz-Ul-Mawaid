// sw.js — Faiz-ul-Mawaid Chattogram Service Worker
// Enables complete offline operation and lightning-fast loading

const CACHE_NAME = 'chattogram-fmb-v6';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/miqaats.json',
  'https://i.ibb.co/Jw8KbHVf/fmb-logo.png',
  'https://i.ibb.co/kVTGskyG/images.jpg',
  'https://i.ibb.co/hJ8d3NCk/Chat-GPT-Image-Oct-1-2026-09-01-54-PM.png',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Use cache.addAll with individual catch so failures on external resources don't break install
      return Promise.allSettled(
        PRECACHE_ASSETS.map(asset =>
          cache.add(asset).catch(err => {
            console.warn('[SW] Could not precache asset:', asset, err.message);
          })
        )
      );
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests
  if (request.method !== 'GET') return;

  // 1. Navigation / HTML requests: Network-first, fallback to cached index.html
  const isHTML = request.mode === 'navigate' ||
                 request.destination === 'document' ||
                 url.pathname === '/' ||
                 url.pathname.endsWith('.html');

  if (isHTML) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request) ||
                         await caches.match('/index.html') ||
                         await caches.match('/');
          if (cached) return cached;
          return new Response('Currently you are offline', {
            status: 200,
            headers: { 'Content-Type': 'text/html' }
          });
        })
    );
    return;
  }

  // 2. Images, Fonts, Scripts: Cache-first with network fallback
  const isStatic = url.pathname.endsWith('.png') ||
                   url.pathname.endsWith('.jpg') ||
                   url.pathname.endsWith('.jpeg') ||
                   url.pathname.endsWith('.svg') ||
                   url.pathname.endsWith('.json') ||
                   url.hostname.includes('fonts.googleapis.com') ||
                   url.hostname.includes('fonts.gstatic.com') ||
                   url.hostname.includes('cdnjs.cloudflare.com') ||
                   url.hostname.includes('i.ibb.co');

  if (isStatic) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        }).catch(() => {
          // If offline and request is the logo or image
          return cached || Response.error();
        });
      })
    );
    return;
  }

  // 3. API requests: Network-first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Default: Network with cache fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
