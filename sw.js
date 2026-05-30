// EMS Quest service worker.
// Strategy: cache-first for the single-file app shell. On first install we
// pre-cache the HTML + manifest + icon so the game can launch offline.
// On every navigation/fetch we serve from cache when present and fall back
// to the network; successful network responses overwrite the cache so the
// next launch picks up new builds. Bump CACHE_VERSION when you ship a new
// build to force clients to refresh.

const CACHE_VERSION = 'emsq-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(
    caches.match(req).then((cached) => {
      const networked = fetch(req).then((res) => {
        // Only cache same-origin successful responses.
        if (res && res.ok && new URL(req.url).origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || networked;
    })
  );
});
