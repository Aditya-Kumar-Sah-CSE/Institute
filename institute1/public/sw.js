const CACHE_NAME = 'skillarena-v4';

const APP_SHELL_STATIC = [
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL_STATIC))
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
  // Support for range requests (e.g., Safari video)
  if (event.request.headers.get('range')) {
    return;
  }

  const url = new URL(event.request.url);

  // 1. HTML -> Network First
  if (event.request.mode === 'navigate' || (event.request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          '<html><body style="background:rgba(0,0,0,1); display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; margin:0;"><h1 style="color:white; font-family:sans-serif; text-align:center;">Offline</h1><p style="color:gray; font-family:sans-serif; text-align:center;">Please check your internet connection.</p></body></html>',
          { headers: { 'Content-Type': 'text/html' }, status: 200 }
        );
      })
    );
    return;
  }

  // 2. Images and Fonts -> Cache First
  const isImageOrFont = 
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|gif|ico)$/i) ||
    url.pathname.match(/\.(woff|woff2|ttf|eot)$/i) ||
    url.pathname.includes('/storage/v1/object/public/');

  if (isImageOrFont) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        
        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')) {
            return networkResponse;
          }
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          return networkResponse;
        }).catch(() => new Response(null, { status: 503 }));
      })
    );
    return;
  }

  // 3. App Shell JS & CSS (Next.js assets) -> Stale While Revalidate
  if (url.pathname.startsWith('/_next/static/') || url.pathname.match(/\.(js|css)$/i)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => null);
        
        return cachedResponse || fetchPromise || new Response(null, { status: 503 });
      })
    );
    return;
  }

  // 4. API Requests -> Network First (No caching of authenticated user data here)
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ error: 'Service Unavailable (Offline)' }), {
          status: 503, headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // 5. Default -> Network First
  event.respondWith(
    fetch(event.request).catch(() => new Response(null, { status: 503 }))
  );
});
