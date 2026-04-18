// Bump this when you change precached static assets so clients drop old caches.
const CACHE_NAME = 'your-one-pace-v2';
const PRECACHE_URLS = [
  './',
  './index.html',
  './index.css',
  './app.js',
  './data.js',
  './manifest.json',
  './icons/pwa-512.png'
];

/** HTML + JS: network-first so deploys (especially data.js links) are not stuck behind stale SW cache. */
function useNetworkFirst(url) {
  const p = url.pathname;
  return (
    p.endsWith('data.js') ||
    p.endsWith('app.js') ||
    p.endsWith('index.html') ||
    p.endsWith('/') ||
    p === ''
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (useNetworkFirst(url)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          if (response.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        if (response.status === 200) {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});
