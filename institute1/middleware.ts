import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'smartlearn.in';

// ── ALL segments that are reserved at the root level ──
// None of these should ever be mistaken for a tenant slug.
const RESERVED_SEGMENTS = new Set([
  // Static / infra
  'api', '_next', 'favicon.ico', 'manifest.json', 'robots.txt',
  // Public root pages (have their own pages under src/app/(public)/...)
  'login', 'signup', 'forgot-password', 'reset-password',
  'apply-institution', 'apply-instructor',
  'institution-not-found', 'institution-disabled',
  'contact', 'pwa-start', 'admission',
  // Platform routes that need __platform__ rewrite
  'admin', 'dashboard', 'instructor',
  'courses', 'doubts', 'notices', 'leaderboard',
  'profile', 'feedbacks', 'share-doubt', 'users',
  'batch', 'certificates',
]);

// Segments that belong to the global Super Admin Platform
const PLATFORM_SEGMENTS = new Set([
  'admin', 'dashboard', 'instructor',
  'courses', 'doubts', 'notices', 'leaderboard',
  'profile', 'feedbacks', 'share-doubt', 'users',
  'batch', 'certificates',
]);

function isStaticAsset(pathname: string): boolean {
  return /\.(?:svg|png|jpg|jpeg|gif|webp|json|ico|js|css|woff2?)$/i.test(pathname);
}

export async function middleware(request: NextRequest) {
  try {
    const hostname = request.headers.get('host') || '';
    const pathname = request.nextUrl.pathname;

    if (isStaticAsset(pathname) || pathname.startsWith('/_next')) {
      return NextResponse.next();
    }

    const segments = pathname.split('/').filter(Boolean);
    const firstSegment = segments[0] || '';

    let tenantSlug: string | null = null;
    let routingMode = 'root';
    let contextType = 'ROOT';

    // ─────────────────────────────────────────────────────────
    // CASE 1: First segment is an internal or platform route
    // ─────────────────────────────────────────────────────────
    if (RESERVED_SEGMENTS.has(firstSegment) || firstSegment.startsWith('_') || firstSegment.includes('.')) {
      if (PLATFORM_SEGMENTS.has(firstSegment)) {
        contextType = 'PLATFORM';
        routingMode = 'platform';
      }
    }
    // ─────────────────────────────────────────────────────────
    // CASE 2: Routing resolves to a Tenant
    // ─────────────────────────────────────────────────────────
    else if (hostname.includes('localhost') || hostname.includes('.vercel.app')) {
      // Path-based tenancy: /[tenantSlug]/...
      if (firstSegment) {
        tenantSlug = firstSegment;
        routingMode = 'development';
        contextType = 'TENANT';
      }
    } else if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
      // Subdomain-based tenancy
      tenantSlug = hostname.replace(`.${ROOT_DOMAIN}`, '');
      routingMode = 'wildcard';
      contextType = 'TENANT';
    } else if (hostname !== ROOT_DOMAIN && !hostname.includes('localhost')) {
      // Custom domain tenancy
      tenantSlug = hostname;
      routingMode = 'custom';
      contextType = 'TENANT';
    }

    // ── Inject Context Headers ──
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-context-type', contextType);
    requestHeaders.set('x-routing-mode', routingMode);

    const impersonatedSlug = request.cookies.get('impersonated_tenant_slug')?.value;
    const effectiveTenantSlug = impersonatedSlug || tenantSlug;

    if (effectiveTenantSlug) {
      requestHeaders.set('x-tenant-slug', effectiveTenantSlug);
      if (impersonatedSlug) {
        requestHeaders.set('x-is-impersonating', 'true');
      }
    }

    // ── Run Supabase auth session check ──
    const authRequest = new NextRequest(request.nextUrl.clone(), {
      headers: requestHeaders,
    });

    const supabaseResponse = await updateSession(authRequest);

    if (supabaseResponse.status === 302 || supabaseResponse.status === 307) {
      return supabaseResponse;
    }

    // ── Build final response WITHOUT rewrites ──
    const finalResponse = NextResponse.next({
      request: { headers: requestHeaders },
    });

    // Copy auth cookies from Supabase response
    supabaseResponse.headers.getSetCookie().forEach((cookie) => {
      finalResponse.headers.append('Set-Cookie', cookie);
    });

    if (tenantSlug) {
      finalResponse.cookies.set('last_tenant_slug', tenantSlug, {
        path: '/',
        httpOnly: false,
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    return finalResponse;
  } catch (err: any) {
    console.error('[Middleware Error]', err);
    return NextResponse.json({ error: String(err), stack: err.stack, customMiddlewareError: true }, { status: 500 });
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json)$).*)',
  ],
};
