const CACHE_NAME = 'skillarena-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/manifest.json',
        '/icon-192x192.png',
        '/icon-512x512.png'
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          '<html><body><h1 style="color:white; font-family:sans-serif; text-align:center; margin-top:20%">Offline</h1><p style="color:gray; font-family:sans-serif; text-align:center;">Please check your internet connection.</p></body></html>',
          { headers: { 'Content-Type': 'text/html' } }
        );
      })
    );
    return;
  }

  const url = new URL(event.request.url);
  // Only cache specific static assets
  if (url.pathname.endsWith('.png') || url.pathname.endsWith('manifest.json')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  } else {
    // Always fetch from network for HTML/API to keep Next.js middleware working
    event.respondWith(fetch(event.request).catch(() => new Response('Offline')));
  }
});
