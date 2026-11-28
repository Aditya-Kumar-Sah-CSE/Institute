import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { normalizeRole } from '@/lib/role-utils';
import { NextResponse, type NextRequest } from 'next/server';

// Reuse admin client across middleware invocations and short-TTL cache non-privileged student role lookups
let sharedAdminClient: ReturnType<typeof createSupabaseAdmin> | null = null;
function getMiddlewareAdminClient() {
  if (!sharedAdminClient && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    sharedAdminClient = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return sharedAdminClient;
}

const ROLE_CACHE_TTL_MS = 20_000;
const roleCache = new Map<string, { role: string; instituteId: string | null; exp: number }>();

const AUTH_CACHE_TTL_MS = 12_000;
const AUTH_CACHE_MAX = 3000;
const authVerifyCache = new Map<string, { user: any; exp: number }>();
const authVerifyInFlight = new Map<string, Promise<{ user: any; error: any }>>();

function decodeBase64UrlText(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((input.length + 3) % 4);
  return atob(padded);
}

function extractEdgeJwtExpMs(authCookies: { value: string }[]): number | null {
  for (const c of authCookies) {
    try {
      let token = c.value;
      if (token.startsWith('base64-')) {
        token = decodeBase64UrlText(token.slice(7));
      }
      if (token.startsWith('{') || token.startsWith('[')) {
        const parsed = JSON.parse(token);
        const jwt = typeof parsed?.access_token === 'string' ? parsed.access_token : Array.isArray(parsed) ? parsed[0] : '';
        if (typeof jwt === 'string' && jwt.includes('.')) token = jwt;
      }
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(decodeBase64UrlText(parts[1]));
        if (typeof payload?.exp === 'number') return payload.exp * 1000;
      }
    } catch {
      // Ignore malformed chunks
    }
  }
  return null;
}

async function computeAuthCookieDigest(authCookies: { name: string; value: string }[]): Promise<string | null> {
  try {
    if (!globalThis.crypto?.subtle) return null;
    const raw = authCookies
      .map((c) => `${c.name}=${c.value}`)
      .sort()
      .join(';');
    const buf = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
    const bytes = new Uint8Array(buf);
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex;
  } catch {
    return null;
  }
}

function getCachedUserMeta(userId: string) {
  const entry = roleCache.get(userId);
  if (!entry) return null;
  if (Date.now() > entry.exp) {
    roleCache.delete(userId);
    return null;
  }
  return entry;
}

function setCachedUserMeta(userId: string, role: string, instituteId: string | null) {
  if (roleCache.size > 2000) {
    const firstKey = roleCache.keys().next().value;
    if (firstKey) roleCache.delete(firstKey);
  }
  roleCache.set(userId, { role, instituteId, exp: Date.now() + ROLE_CACHE_TTL_MS });
}

export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const host = request.headers.get('host') || '';
  const { pathname } = request.nextUrl;

  // Extract path segment (e.g. /bce-bhagalpur/login)
  const pathSegments = pathname.split('/').filter(Boolean);
  const firstPathSegment = pathSegments[0]?.toLowerCase();

  let tenantSlug: string | null = null;
  let routingMode: 'path' | 'subdomain' | 'custom-domain' | 'default' = 'default';

  // 1. Check custom domain or wildcard subdomain
  // e.g. bce.smartlearn.in or portal.bce.edu (excluding localhost and app domains)
  const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
  const isVercelPreview = host.includes('.vercel.app');
  
  if (!isLocalhost && !isVercelPreview) {
    const parts = host.split('.');
    if (parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'smartlearn') {
      tenantSlug = parts[0];
      routingMode = 'subdomain';
    } else if (parts.length >= 2 && !host.includes('smartlearn.in')) {
      tenantSlug = host;
      routingMode = 'custom-domain';
    }
  }

  // 2. Check path-based routing if tenant not resolved via domain
  // CRITICAL: Every root-level app route MUST be reserved here. If any app route
  // is missing, its first path segment gets mistaken for a tenant slug, which makes
  // the middleware treat e.g. /leaderboard as a tenant landing page and redirect
  // authenticated users back to /dashboard (production navigation bug).
  const reservedPaths = [
    'api', '_next', 'login', 'signup', 'dashboard', 'admin', 'super-admin', 'instructor',
    'apply-instructor', 'apply-institution', 'forgot-password', 'reset-password',
    // Root-level app routes (route groups (dashboard), (admin), (instructor), (public))
    'courses', 'leaderboard', 'doubts', 'notices', 'profile', 'feedbacks',
    'share-doubt', 'users', 'batch', 'certificates', 'code-arena', 'sheets', 'share',
    'games', 'settings', 'verify', 'verify-email',
    // Misc root pages & static metadata endpoints
    'admission', 'pwa-start', 'contact', 'institution-not-found', 'institution-disabled',
    'privacy', 'terms', 'latex-editor', 'student', 'polls', 'robots.txt', 'sitemap.xml',
    'manifest.json', 'sw.js',
  ];
  if (!tenantSlug && firstPathSegment && !reservedPaths.includes(firstPathSegment)) {
    tenantSlug = firstPathSegment;
    routingMode = 'path';
  }

  // Inject tenant context headers
  if (tenantSlug) {
    requestHeaders.set('x-tenant-slug', tenantSlug);
    requestHeaders.set('x-routing-mode', routingMode);
  }

  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
      global: {
        fetch: (url, options) => {
          return fetch(url, { ...options, cache: 'no-store' });
        },
      },
    }
  );

  // Public routes and public/self-authenticated API routes that don't require middleware session gating
  const publicRoutes = ['/', '/login', '/signup', '/verify-email', '/apply-instructor', '/forgot-password', '/reset-password', '/privacy', '/terms', '/pwa-start'];
  const isPublicApi =
    pathname === '/api/health' ||
    pathname.startsWith('/api/public/') ||
    pathname.startsWith('/api/cron/') ||
    pathname === '/api/auth/callback' ||
    pathname === '/api/coding/contests';
  const isPublicRoute =
    publicRoutes.includes(pathname) ||
    isPublicApi ||
    (tenantSlug && (pathname === `/${tenantSlug}` || pathname === `/${tenantSlug}/verify-email`)) ||
    pathname.startsWith('/share/') ||
    pathname.startsWith('/sheets/') ||
    pathname.startsWith('/verify/') ||
    pathname.startsWith('/verify-email');

  const reqCookies = request.cookies.getAll();
  const authCookies = reqCookies.filter(
    (c) => c.name.startsWith('sb-') || c.name.includes('auth-token') || c.name.startsWith('supabase-')
  );
  const hasAuthCookie = authCookies.length > 0;

  const bypassAuthCache =
    (request.method !== 'GET' && request.method !== 'HEAD') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/instructor') ||
    pathname.startsWith('/super-admin') ||
    pathname.startsWith('/api/admin') ||
    pathname.startsWith('/api/super-admin') ||
    pathname.startsWith('/account') ||
    pathname.startsWith('/settings');

  // Fast path: skip remote Supabase auth call on public routes when visitor has no auth cookies
  let user: any = null;
  let authError: any = null;
  if (hasAuthCookie || !isPublicRoute) {
    let tokenKey: string | null = null;
    if (hasAuthCookie && !bypassAuthCache) {
      tokenKey = await computeAuthCookieDigest(authCookies);
      if (tokenKey) {
        const cachedAuth = authVerifyCache.get(tokenKey);
        if (cachedAuth && Date.now() < cachedAuth.exp) {
          user = cachedAuth.user;
        } else if (cachedAuth) {
          authVerifyCache.delete(tokenKey);
        }
      }
    }

    if (!user) {
      if (tokenKey) {
        let pending = authVerifyInFlight.get(tokenKey);
        if (!pending) {
          pending = (async () => {
            try {
              const authRes = await supabase.auth.getUser();
              const verifiedUser = authRes.data?.user || null;
              if (!authRes.error && verifiedUser) {
                const jwtExpMs = extractEdgeJwtExpMs(authCookies);
                const maxExp = jwtExpMs
                  ? Math.min(Date.now() + AUTH_CACHE_TTL_MS, jwtExpMs)
                  : Date.now() + AUTH_CACHE_TTL_MS;
                if (maxExp > Date.now()) {
                  if (authVerifyCache.size >= AUTH_CACHE_MAX) {
                    const oldest = authVerifyCache.keys().next().value;
                    if (oldest) authVerifyCache.delete(oldest);
                  }
                  authVerifyCache.set(tokenKey!, { user: verifiedUser, exp: maxExp });
                }
              }
              return { user: verifiedUser, error: authRes.error || null };
            } finally {
              authVerifyInFlight.delete(tokenKey!);
            }
          })();
          authVerifyInFlight.set(tokenKey, pending);
        }
        const resolved = await pending;
        user = resolved.user;
        authError = resolved.error;
      } else {
        const authRes = await supabase.auth.getUser();
        user = authRes.data?.user || null;
        authError = authRes.error || null;
      }
    }
  }

  // If there's an auth error (e.g. invalid refresh token) or user is not logged in while holding stale cookies,
  // clear stale auth cookies so the browser doesn't send broken tokens repeatedly.
  if (hasAuthCookie && (authError || !user)) {
    reqCookies.forEach((c) => {
      if (c.name.startsWith('sb-') || c.name.includes('auth-token') || c.name.startsWith('supabase-')) {
        supabaseResponse.cookies.set(c.name, '', { maxAge: 0, path: '/' });
      }
    });
  }

  // Helper function to redirect while preserving cookies
  const redirectWithCookies = (url: URL) => {
    const redirectResponse = NextResponse.redirect(url);
    const setCookieHeaders = supabaseResponse.headers.getSetCookie();
    setCookieHeaders.forEach((header) => {
      redirectResponse.headers.append('Set-Cookie', header);
    });
    return redirectResponse;
  };

  // If not authenticated and trying to access protected route
  if (!user && !isPublicRoute) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = tenantSlug ? `/${tenantSlug}/login` : '/login';
    return redirectWithCookies(url);
  }

  const requiresFreshRoleCheck =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/instructor') ||
    pathname.startsWith('/super-admin') ||
    pathname.startsWith('/api/admin') ||
    pathname.startsWith('/api/super-admin');

  let userRole = 'student';
  if (user && !isPublicApi) {
    const cachedMeta = !requiresFreshRoleCheck ? getCachedUserMeta(user.id) : null;
    let profile: { role: string; institute_id?: string | null } | null = cachedMeta
      ? { role: cachedMeta.role, institute_id: cachedMeta.instituteId }
      : null;

    if (!profile) {
      const adminClient = getMiddlewareAdminClient();
      if (adminClient) {
        try {
          const { data, error } = await adminClient
            .from('profiles')
            .select('role, institute_id')
            .eq('id', user.id)
            .single();

          if (!error && data) {
            profile = data as { role: string; institute_id?: string | null };
          }
        } catch (err) {
          console.error('[Middleware] Admin client fetch error:', err);
        }
      }

      if (!profile) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('role, institute_id')
            .eq('id', user.id)
            .single();

          if (!error && data) {
            profile = data as { role: string; institute_id?: string | null };
          } else if (error) {
            console.error('[Middleware] Anon client profile fetch error:', error);
          }
        } catch (err) {
          console.error('[Middleware] Anon client fetch exception:', err);
        }
      }

      if (profile) {
        setCachedUserMeta(user.id, normalizeRole(profile.role), profile.institute_id || null);
      }
    }

    if (profile) {
      userRole = normalizeRole(profile.role);
      if (profile.institute_id) {
        supabaseResponse.headers.set('x-tenant-id', profile.institute_id);
      }
    } else {
      // Never trust user_metadata.role on missing profile; default to least-privilege student
      userRole = 'student';
    }
  }

  // If authenticated and trying to access login/signup/landing (or tenant landing/login)
  const isAuthOrLandingPage = 
    pathname === '/' || 
    pathname === '/login' || 
    pathname === '/signup' ||
    (tenantSlug && (pathname === `/${tenantSlug}` || pathname === `/${tenantSlug}/login` || pathname === `/${tenantSlug}/signup`));

  if (user && isAuthOrLandingPage) {
    const url = request.nextUrl.clone();
    if (userRole === 'instructor') {
      url.pathname = '/instructor';
    } else if (userRole === 'admin' || userRole === 'developer') {
      url.pathname = '/admin';
    } else {
      url.pathname = '/dashboard';
    }
    return redirectWithCookies(url);
  }

  // Super Admin route protection (/super-admin)
  if (pathname.startsWith('/super-admin')) {
    const targetOwnerEmail = (process.env.SUPER_ADMIN_EMAIL || 'iambestadi@gmail.com').trim().toLowerCase();
    const isOwnerEmail = user?.email?.trim().toLowerCase() === targetOwnerEmail;
    const isOwnerRole = userRole === 'super_admin' || userRole === 'superadmin' || userRole === 'platform_owner';

    if (!user || (!isOwnerEmail && !isOwnerRole)) {
      return new NextResponse(
        `<!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>403 Access Denied | Platform Owner Area</title>
          <style>
            body { font-family: system-ui, sans-serif; background: #0b0f19; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: rgba(255,255,255,0.03); border: 1px solid rgba(239,68,68,0.3); padding: 40px; border-radius: 12px; max-width: 480px; text-align: center; }
            h1 { color: #ef4444; font-size: 48px; margin: 0 0 10px 0; }
            h2 { font-size: 20px; margin: 0 0 16px 0; }
            p { color: #94a3b8; font-size: 14px; line-height: 1.6; }
            a { display: inline-block; margin-top: 20px; background: #06b6d4; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>403</h1>
            <h2>Access Denied</h2>
            <p>Only authorized Platform Owners can access the Super Admin control area.</p>
            <a href="/dashboard">Return to Dashboard</a>
          </div>
        </body>
        </html>`,
        {
          status: 403,
          headers: { 'content-type': 'text/html' },
        }
      );
    }
  }

  // Admin route protection
  if (user && pathname.startsWith('/admin')) {
    if (userRole !== 'admin' && userRole !== 'developer' && userRole !== 'super_admin' && userRole !== 'superadmin') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return redirectWithCookies(url);
    }
  }

  // Instructor route protection
  if (user && pathname.startsWith('/instructor') && pathname !== '/apply-instructor') {
    if (userRole !== 'instructor' && userRole !== 'admin' && userRole !== 'developer' && userRole !== 'super_admin' && userRole !== 'superadmin') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return redirectWithCookies(url);
    }
  }

  // ── Security Headers ──
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  supabaseResponse.headers.set('X-Request-Id', requestId);
  supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff');
  supabaseResponse.headers.set('X-Frame-Options', 'DENY');
  supabaseResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  supabaseResponse.headers.set('X-XSS-Protection', '1; mode=block');
  supabaseResponse.headers.set('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');

  // Scoped Cross-Origin Isolation headers for Terminal/WebContainer
  if (pathname === '/code-arena/compiler' || pathname.startsWith('/code-arena/compiler/')) {
    supabaseResponse.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    supabaseResponse.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  }

  return supabaseResponse;
}
