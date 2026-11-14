const CACHE_NAME = 'nodedeck-cache-v13';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css?v=20261114-v13',
  '/app.js?v=20261114-v13',
  '/vendor/tailwindcss.js',
  '/vendor/lucide.js',
  '/vendor/xterm.js',
  '/vendor/xterm.css',
  '/vendor/addon-fit.js',
  '/vendor/addon-webgl.js',
  '/vendor/fonts/JetBrainsMonoNerdFont-Regular.ttf',
  '/vendor/fonts/JetBrainsMonoNerdFont-Bold.ttf',
  '/manifest.json',
  '/favicon.png',
  '/favicon.svg',
  '/logo.png',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass service worker for WebSocket and API calls
  if (url.pathname.startsWith('/ws') || url.pathname.startsWith('/api')) {
    return;
  }

  // Network first for HTML/app, falling back to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
