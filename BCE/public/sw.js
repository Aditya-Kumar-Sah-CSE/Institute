const CACHE_VERSION = 'smartlearn-v14';
const CACHE_STATIC = `smartlearn-static-${CACHE_VERSION}`;
const CACHE_COURSE = `smartlearn-course-${CACHE_VERSION}`;
const CACHE_MEDIA = `smartlearn-media-${CACHE_VERSION}`;
const ALLOWED_CACHES = [CACHE_STATIC, CACHE_COURSE, CACHE_MEDIA];

// Pre-cache core shell resources on install for sub-300ms instant open
const SHELL_ASSETS = [
  '/pwa-start',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Offline fallback HTML
const OFFLINE_HTML = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline | Smart Learn</title><style>
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
</body></html>`;

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
    Promise.all([
      // Enable Navigation Preload if supported (cuts navigation latency by 50-100ms)
      'navigationPreload' in self.registration
        ? self.registration.navigationPreload.enable().catch(() => {})
        : Promise.resolve(),
      // Evict older caches
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames.map((name) => {
            if ((name.startsWith('smartlearn-') || name.startsWith('skillarena-')) && !ALLOWED_CACHES.includes(name)) {
              console.log(`PWA: Evicting obsolete cache: ${name}`);
              return caches.delete(name);
            }
          })
        )
      )
    ]).then(() => self.clients.claim())
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

  // 4. HTML Navigation Requests (PWA cold-start and in-app page transitions)
  if (event.request.mode === 'navigate') {
    // 4A. /pwa-start -> Instant Shell (Cache-First with Background Revalidate for <300ms launch)
    if (url.pathname === '/pwa-start') {
      event.respondWith(
        caches.open(CACHE_STATIC).then(async (cache) => {
          const cached = await cache.match('/pwa-start');

          // Always fetch in background to keep shell up to date
          const networkFetch = fetch(event.request).then((networkRes) => {
            if (networkRes && networkRes.status === 200) {
              cache.put('/pwa-start', networkRes.clone());
            }
            return networkRes;
          }).catch(() => null);

          // If cached, return immediately (<10ms!)
          if (cached) {
            return cached;
          }

          // Otherwise await network or return offline page
          const res = await networkFetch;
          if (res) return res;

          return new Response(OFFLINE_HTML, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
            status: 200
          });
        })
      );
      return;
    }

    // 4B. Other HTML Navigations -> Navigation Preload / Fast Network-First with Cache Fallback
    event.respondWith(
      (async () => {
        try {
          // Check for preloaded response
          const preloadResponse = await event.preloadResponse;
          if (preloadResponse) {
            const cache = await caches.open(CACHE_STATIC);
            cache.put(event.request, preloadResponse.clone());
            return preloadResponse;
          }

          // Race network fetch against a 400ms timeout for slow mobile connections
          const controller = new AbortController();
          const fetchPromise = fetch(event.request, { signal: controller.signal })
            .then(async (networkRes) => {
              if (networkRes && networkRes.status === 200) {
                const cache = await caches.open(CACHE_STATIC);
                cache.put(event.request, networkRes.clone());
              }
              return networkRes;
            });

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('SW_NAV_TIMEOUT')), 400)
          );

          try {
            return await Promise.race([fetchPromise, timeoutPromise]);
          } catch (err) {
            // Network was slow or offline: try cache fallback
            const cached = await caches.match(event.request);
            if (cached) {
              return cached;
            }
            // If not cached, await original fetch without timeout
            return await fetchPromise;
          }
        } catch (fetchErr) {
          // Final fallback: check cache or return offline screen
          const cached = await caches.match(event.request);
          if (cached) return cached;

          return new Response(OFFLINE_HTML, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
            status: 200
          });
        }
      })()
    );
    return;
  }

  // 5. Next.js Static Chunks (_next/static/) -> Cache-First for Ultra-Fast Loading
  // Next.js static chunks have unique content-hashes in their names, making them immutable.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(CACHE_STATIC).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) {
          return cached;
        }

        try {
          const networkRes = await fetch(event.request);
          if (networkRes && networkRes.status === 200) {
            cache.put(event.request, networkRes.clone());
          }
          return networkRes;
        } catch {
          return new Response(null, { status: 503 });
        }
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

  // 10. UNHANDLED / GENERIC REQUESTS -> Let browser handle natively
  return;
});
