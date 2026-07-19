const CACHE_NAME = 'skillarena-v5';

// Pre-cache these on install for instant shell loads
const APP_SHELL_STATIC = [
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/pwa-start',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(APP_SHELL_STATIC).catch(() => {})
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) return caches.delete(name);
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Skip range requests (e.g., Safari video)
  if (event.request.headers.get('range')) return;

  // Skip non-GET requests (Server Actions, form posts, etc.)
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 1. Next.js static assets → Cache First (they have content hashes, safe to cache forever)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return res;
        }).catch(() => new Response(null, { status: 503 }));
      })
    );
    return;
  }

  // 2. Images & Fonts → Cache First
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
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return res;
        }).catch(() => new Response(null, { status: 503 }));
      })
    );
    return;
  }

  // 3. API & Supabase → Network Only (never cache authenticated data)
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

  // 4. HTML navigation → Network First, fallback to offline page
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(
          `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title><style>
            *{margin:0;padding:0;box-sizing:border-box}
            body{background:#000;color:#fff;font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:16px;text-align:center;padding:24px}
            h1{font-size:1.5rem;background:linear-gradient(to right,#00f2fe,#4facfe);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
            p{color:#888;font-size:.95rem}
            button{margin-top:8px;padding:10px 24px;background:linear-gradient(to right,#00f2fe,#4facfe);border:none;border-radius:24px;color:#000;font-weight:700;cursor:pointer;font-size:1rem}
          </style></head><body>
            <div style="font-size:3rem">📡</div>
            <h1>You're Offline</h1>
            <p>Please check your internet connection and try again.</p>
            <button onclick="location.reload()">Retry</button>
          </body></html>`,
          { headers: { 'Content-Type': 'text/html' }, status: 200 }
        )
      )
    );
    return;
  }

  // 5. Everything else → Network First
  event.respondWith(
    fetch(event.request).catch(() => new Response(null, { status: 503 }))
  );
});
