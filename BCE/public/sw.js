const CACHE_VERSION = 'smartlearn-v10';
const CACHE_STATIC = `smartlearn-static-${CACHE_VERSION}`;
const CACHE_COURSE = `smartlearn-course-${CACHE_VERSION}`;
const CACHE_MEDIA = `smartlearn-media-${CACHE_VERSION}`;

// Listen for message from client to skip waiting immediately on update
self.addEventListener('message', (event) => {
  if (event.data && (event.data.type === 'SKIP_WAITING' || event.data === 'SKIP_WAITING')) {
    self.skipWaiting();
  }
});

// Pre-cache core shell resources on install
const SHELL_ASSETS = [
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/pwa-start',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) =>
      cache.addAll(SHELL_ASSETS).catch((e) => console.warn('Pre-cache warning:', e))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  const activeCaches = [CACHE_STATIC, CACHE_COURSE, CACHE_MEDIA];
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((name) => {
          if (!activeCaches.includes(name)) {
            console.log(`PWA: Evicting obsolete cache storage: ${name}`);
            return caches.delete(name);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Skip range requests (Safari video streaming)
  if (event.request.headers.get('range')) return;

  // Skip non-GET requests (e.g. Server Actions, posts, outbox inserts)
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip Next.js RSC payloads & prefetch navigation trees
  if (url.searchParams.has('_rsc') || event.request.headers.get('RSC') || event.request.headers.get('Next-Router-State-Tree')) {
    return;
  }

  // 1. Next.js Static Chunks & Build CSS/JS → Cache First (contains build hash, safe to cache)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_STATIC).then((cache) => cache.put(event.request, clone));
          }
          return res;
        }).catch(() => new Response(null, { status: 503 }));
      })
    );
    return;
  }

  // 2. Course Content APIs → Stale-While-Revalidate
  // Caches course data, details, and lesson lists for offline access while updating in background
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
            console.warn('SW course content API fetch failed:', err);
          });
          return cachedResponse || fetchPromise || new Response(JSON.stringify({ error: 'Offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
        });
      })
    );
    return;
  }

  // 3. Static Media, CDN, and Public Supabase Storage Assets → Cache First
  const isImageOrFont =
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|gif|ico|woff|woff2|ttf|eot)$/i) ||
    url.pathname.includes('/storage/v1/object/public/');

  if (isImageOrFont) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
            const clone = res.clone();
            caches.open(CACHE_MEDIA).then((cache) => cache.put(event.request, clone));
          }
          return res;
        }).catch(() => new Response(null, { status: 503 }));
      })
    );
    return;
  }

  // 4. Authenticated Realtime APIs or Supabase DB Operations → Network Only
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase.co')) {
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

  // 5. HTML Navigation Modes → Network First with clean Offline page fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(
          `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline | SmartLearn</title><style>
            *{margin:0;padding:0;box-sizing:border-box}
            body{background:#000;color:#fff;font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:16px;text-align:center;padding:24px}
            h1{font-size:1.5rem;background:linear-gradient(to right,#00f2fe,#4facfe);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
            p{color:#888;font-size:.95rem}
            button{margin-top:8px;padding:10px 24px;background:linear-gradient(to right,#00f2fe,#4facfe);border:none;border-radius:24px;color:#000;font-weight:700;cursor:pointer;font-size:1rem}
          </style></head><body>
            <div style="font-size:3rem">📡</div>
            <h1>SmartLearn: You're Offline</h1>
            <p>Please check your internet connection to continue learning.</p>
            <button onclick="location.reload()">Retry Connection</button>
          </body></html>`,
          { headers: { 'Content-Type': 'text/html' }, status: 200 }
        )
      )
    );
    return;
  }

  // 6. Generic Routes Fallback → Network First
  event.respondWith(
    fetch(event.request).catch(() => new Response(null, { status: 503 }))
  );
});
