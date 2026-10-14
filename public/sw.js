// KEREN PWA Service Worker
const CACHE_NAME = 'keren-pwa-v1';
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/logo.png',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Precache partial fail:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch handler required for Chrome PWA installability criteria
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  // Let browser handle internal Next.js API / auth calls directly
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache static assets on the fly
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (event.request.url.includes('/_next/static') ||
           event.request.url.includes('/icon-') ||
           event.request.url.includes('/logo.png'))
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
