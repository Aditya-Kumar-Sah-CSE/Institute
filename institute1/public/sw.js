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
  const isMedia = url.pathname.includes('/storage/v1/object/public/');
  const isStatic = url.pathname.endsWith('.png') || url.pathname.endsWith('.jpg') || url.pathname.endsWith('.webp') || url.pathname.endsWith('manifest.json');

  if (isMedia || isStatic) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response; // Return from cache immediately
        }
        // Fetch from network and put in cache for future
        return fetch(event.request).then((networkResponse) => {
          // Check if we received a valid response
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        });
      })
    );
  } else {
    // Always fetch from network for HTML/API to keep Next.js middleware working
    event.respondWith(
      fetch(event.request).catch(() => {
        // Return a generic 503 response to avoid 'promise was rejected' network errors
        return new Response(null, { status: 503, statusText: 'Service Unavailable' });
      })
    );
  }
});
