const CACHE_NAME = 'priaxom-hyperengine-v2';
const ASSETS_TO_CACHE = [
  '/PriAxomPRO/',
  '/PriAxomPRO/index.html',
  '/PriAxomPRO/style.css',
  '/PriAxomPRO/script.js',
  '/PriAxomPRO/bg.png',
  '/PriAxomPRO/icon-192.png',
  '/PriAxomPRO/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
