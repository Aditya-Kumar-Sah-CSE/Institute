const CACHE_VERSION = 'smartlearn-v13';
const CACHE_STATIC = `smartlearn-static-${CACHE_VERSION}`;
const CACHE_COURSE = `smartlearn-course-${CACHE_VERSION}`;
const CACHE_MEDIA = `smartlearn-media-${CACHE_VERSION}`;
const ALLOWED_CACHES = [CACHE_STATIC, CACHE_COURSE, CACHE_MEDIA];

// Pre-cache core shell resources on install
const SHELL_ASSETS = [
  '/manifest.json',
  '/favicon.ico',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Listen for message from client to skip waiting immediately on update
self.addEventListener('message', (event) => {
  if (event.data && (event.data.type === 'SKIP_WAITING' || event.data === 'SKIP_WAITING')) {
    self.skipWaiting();
  }
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) =>
      cache.addAll(SHELL_ASSETS).catch((e) => console.warn('PWA Pre-cache warning:', e))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((name) => {
          // Remove old Smart Learn caches (v10, etc.) and legacy SkillArena caches
          if ((name.startsWith('smartlearn-') || name.startsWith('skillarena-')) && !ALLOWED_CACHES.includes(name)) {
            console.log(`PWA: Evicting obsolete cache: ${name}`);
            return caches.delete(name);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // 1. Request Safety Exclusions: Ignore non-GET, range, and non-http(s) requests
  if (event.request.method !== 'GET') return;
  if (event.request.headers.get('range')) return;
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);

  // 2. Ignore Next.js RSC payloads & prefetch navigation trees
  if (
    url.searchParams.has('_rsc') ||
    event.request.headers.get('RSC') ||
    event.request.headers.get('Next-Router-State-Tree')
  ) {
    return;
  }

  // 3. Ignore Supabase API/DB requests, auth/session routes, & sensitive endpoints
  if (
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/api/auth') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/login')
  ) {
    return;
  }

  // 4. HTML Navigation Requests -> Network-First with offline page fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(
          `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline | Smart Learn</title><style>
            *{margin:0;padding:0;box-sizing:border-box}
            body{background:#0b0f19;color:#fff;font-family:system-ui,-apple-system,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:16px;text-align:center;padding:24px}
            h1{font-size:1.5rem;background:linear-gradient(to right,#00f2fe,#4facfe);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
            p{color:#94a3b8;font-size:.95rem;max-width:360px;line-height:1.5}
            button{margin-top:8px;padding:10px 24px;background:linear-gradient(to right,#00f2fe,#4facfe);border:none;border-radius:24px;color:#000;font-weight:700;cursor:pointer;font-size:1rem}
          </style></head><body>
            <div style="font-size:3rem">📡</div>
            <h1>Smart Learn: You're Offline</h1>
            <p>Please check your internet connection to continue learning.</p>
            <button onclick="location.reload()">Retry Connection</button>
          </body></html>`,
          { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 200 }
        )
      )
    );
    return;
  }

  // 5. Next.js Static Chunks (_next/static/) -> Network-First to prevent stale
  // module graphs from mixing with a newer App Router page.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      fetch(event.request).then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_STATIC).then((cache) => cache.put(event.request, clone));
        }
        return res;
      }).catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          return new Response(null, { status: 503 });
        });
      })
    );
    return;
  }

  // 6. Web App Manifest (/manifest.json) -> Stale-While-Revalidate with clean response guarantee
  if (url.pathname === '/manifest.json') {
    event.respondWith(
      caches.open(CACHE_STATIC).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => null);

          if (cachedResponse) {
            return cachedResponse;
          }
          return fetchPromise.then((res) => {
            if (res && res.status === 200) return res;
            return fetch('/manifest.json');
          });
        });
      })
    );
    return;
  }

  // 7. Course Content APIs -> Stale-While-Revalidate
  if (url.pathname.startsWith('/api/courses') || url.pathname.startsWith('/api/lessons')) {
    event.respondWith(
      caches.open(CACHE_COURSE).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch((err) => {
            console.warn('SW course content fetch failed:', err);
            return null;
          });

          if (cachedResponse) return cachedResponse;
          return fetchPromise.then((res) => {
            if (res) return res;
            return new Response(JSON.stringify({ error: 'Offline' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            });
          });
        });
      })
    );
    return;
  }

  // 8. Static Media, Fonts, & Images -> Stale-While-Revalidate
  const isImageOrFont =
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|gif|ico|woff|woff2|ttf|eot)$/i) ||
    url.pathname.includes('/storage/v1/object/public/');

  if (isImageOrFont) {
    event.respondWith(
      caches.open(CACHE_MEDIA).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            if (
              networkResponse &&
              networkResponse.status === 200 &&
              (networkResponse.type === 'basic' || networkResponse.type === 'cors')
            ) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => null);

          if (cachedResponse) return cachedResponse;
          return fetchPromise.then((res) => res || new Response(null, { status: 503 }));
        });
      })
    );
    return;
  }

  // 9. Other dynamic /api/ endpoints -> Network-Only (do not cache)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'Offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // 10. UNHANDLED / GENERIC REQUESTS -> DO NOTHING.
  // Bypass Service Worker completely and let browser handle natively!
  return;
});
