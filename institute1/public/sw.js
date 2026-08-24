/**
 * Smart Learn Service Worker
 *
 * Strategy:
 *  - _next/static/*  → Cache-First  (content-hashed, safe forever)
 *  - Images / fonts  → Cache-First  (immutable assets)
 *  - API / Supabase  → Network-Only (auth data must never be cached)
 *  - HTML navigation → Network-First (always fresh from server)
 *  - Auth routes     → Network-Only, never cache (prevents redirect loops)
 *
 * On every new Vercel deploy, CACHE_VERSION changes because it embeds
 * the deployment build timestamp injected at build time.
 * This ensures old JS chunks are never mixed with new HTML.
 */

// ─── Build-time injected version ────────────────────────────────────────────
// next.config.ts injects NEXT_PUBLIC_DEPLOY_ID at build time.
// If not available (local dev), fall back to a timestamp so the cache
// is never reused across local builds.
const DEPLOY_ID =
  self.__DEPLOY_ID__ ||           // injected by next.config.ts via DefinePlugin-like replacement
  (typeof process !== 'undefined' && typeof process.env !== 'undefined'
    ? process.env.NEXT_PUBLIC_DEPLOY_ID
    : undefined) ||
  Date.now().toString(36);        // last-resort: unique every install in dev

const CACHE_NAME = `skillarena-${DEPLOY_ID}`;

// ─── Routes that must NEVER be cached ───────────────────────────────────────
// Caching these causes redirect loops and stale auth state.
const NEVER_CACHE_PATHS = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/pwa-start',
  '/api/',
  '/auth/',
];

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

// ─── Helpers ─────────────────────────────────────────────────────────────────
function isNeverCache(url) {
  const { pathname } = url;
  return NEVER_CACHE_PATHS.some((p) => pathname === p || pathname.startsWith(p));
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    /\.(png|jpg|jpeg|svg|webp|gif|ico|woff|woff2|ttf|eot)$/i.test(url.pathname) ||
    url.pathname.includes('/storage/v1/object/public/')
  );
}

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  // skipWaiting so the new SW takes control immediately on next navigation
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL_STATIC).catch(() => {}))
  );
});

// ─── Activate ────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names.map((name) => {
            if (name !== CACHE_NAME) return caches.delete(name);
          })
        )
      )
      .then(() => self.clients.claim())
      .then(() => {
        // Tell every open tab: "new SW is in control — reload for fresh chunks"
        return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      })
      .then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_ACTIVATED', cacheName: CACHE_NAME });
        });
      })
  );
});

// ─── Fetch ───────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  // Skip non-GET (form POSTs, Server Actions, etc.)
  if (event.request.method !== 'GET') return;
  // Skip Range requests (Safari video seeking)
  if (event.request.headers.get('range')) return;

  const url = new URL(event.request.url);

  // ── 1. Cross-origin: pass through (don't intercept analytics, CDNs, etc.) ──
  if (url.origin !== self.location.origin && !url.hostname.includes('supabase.co')) {
    return;
  }

  // ── 2. Supabase API → Network-Only ──────────────────────────────────────────
  if (url.hostname.includes('supabase.co')) {
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

  // ── 3. Auth / public routes → Network-Only (never cache!) ───────────────────
  if (isNeverCache(url)) {
    event.respondWith(
      fetch(event.request).catch(() =>
        // Offline fallback specifically for navigation to auth pages
        event.request.mode === 'navigate'
          ? offlinePage()
          : new Response(null, { status: 503 })
      )
    );
    return;
  }

  // ── 4. Next.js API routes → Network-Only ────────────────────────────────────
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

  // ── 5. Static immutable assets → Cache-First ────────────────────────────────
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          // Only cache valid, non-auth responses
          if (
            res &&
            res.status === 200 &&
            !res.headers.get('cache-control')?.includes('no-store') &&
            (res.type === 'basic' || res.type === 'cors')
          ) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return res;
        });
      }).catch(() => new Response(null, { status: 503 }))
    );
    return;
  }

  // ── 6. HTML navigation → Network-First ──────────────────────────────────────
  // Do NOT cache the response — always fresh from server.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => offlinePage())
    );
    return;
  }

  // ── 7. Everything else → Network-First, no caching ──────────────────────────
  event.respondWith(
    fetch(event.request).catch(() => new Response(null, { status: 503 }))
  );
});

// ─── Offline fallback page ───────────────────────────────────────────────────
function offlinePage() {
  return new Response(
    `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Offline — Smart Learn</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#000;color:#fff;font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:16px;text-align:center;padding:24px}
h1{font-size:1.5rem;background:linear-gradient(to right,#00f2fe,#4facfe);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
p{color:#888;font-size:.95rem;max-width:320px;line-height:1.5}
button{margin-top:8px;padding:10px 28px;background:linear-gradient(to right,#00f2fe,#4facfe);border:none;border-radius:24px;color:#000;font-weight:700;cursor:pointer;font-size:1rem}
a{color:#00f2fe;text-decoration:none;font-size:.9rem}
</style></head><body>
<div style="font-size:3rem">📡</div>
<h1>You're Offline</h1>
<p>Check your internet connection and try again.</p>
<button onclick="location.reload()">Retry</button>
<a href="/login" onclick="location.href='/login'">Go to Login</a>
</body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 200 }
  );
}
