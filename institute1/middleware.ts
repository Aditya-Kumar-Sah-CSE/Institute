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

// Subset of RESERVED_SEGMENTS that need the __platform__ virtual tenant
// (i.e., they live under src/app/[tenantSlug]/... and need the tenant layout)
const PLATFORM_REWRITE_SEGMENTS = new Set([
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

    // Skip static assets early
    if (isStaticAsset(pathname) || pathname.startsWith('/_next')) {
      return NextResponse.next();
    }

    const segments = pathname.split('/').filter(Boolean);
    const firstSegment = segments[0] || '';

    // ── Determine tenant slug ──
    let tenantSlug: string | null = null;
    let routingMode = 'root';

    // ─────────────────────────────────────────────────────────
    // CASE 1: First segment is reserved — never treat as tenant
    // ─────────────────────────────────────────────────────────
    if (RESERVED_SEGMENTS.has(firstSegment) || firstSegment.startsWith('_') || firstSegment.includes('.')) {
      // Check if this reserved segment needs the __platform__ rewrite
      if (PLATFORM_REWRITE_SEGMENTS.has(firstSegment)) {
        tenantSlug = '__platform__';
        routingMode = 'platform';
      }
      // Otherwise: tenantSlug stays null, routingMode stays 'root'
      // → request passes through to the actual root page (e.g., /login, /signup)
    }
    // ─────────────────────────────────────────────────────────
    // CASE 2: Not reserved — determine tenant from host or path
    // ─────────────────────────────────────────────────────────
    else if (hostname.includes('localhost') || hostname.includes('.vercel.app')) {
      // Path-based tenancy: /[tenantSlug]/...
      if (firstSegment) {
        tenantSlug = firstSegment;
        routingMode = 'development';
      }
    } else if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
      // Subdomain-based tenancy: bce-bhagalpur.smartlearn.in
      tenantSlug = hostname.replace(`.${ROOT_DOMAIN}`, '');
      routingMode = 'wildcard';
    } else if (hostname !== ROOT_DOMAIN && !hostname.includes('localhost')) {
      // Custom domain tenancy
      tenantSlug = hostname;
      routingMode = 'custom';
    }

    // ── Inject tenant headers ──
    const requestHeaders = new Headers(request.headers);

    // Check superadmin impersonation
    const impersonatedSlug = request.cookies.get('impersonated_tenant_slug')?.value;
    const effectiveTenantSlug = impersonatedSlug || tenantSlug;

    if (effectiveTenantSlug) {
      requestHeaders.set('x-tenant-slug', effectiveTenantSlug);
      requestHeaders.set('x-routing-mode', routingMode);
      if (impersonatedSlug) {
        requestHeaders.set('x-is-impersonating', 'true');
      }
    }

    // ── Run Supabase auth session check ──
    const authRequest = new NextRequest(request.nextUrl.clone(), {
      headers: requestHeaders,
    });

    const supabaseResponse = await updateSession(authRequest);

    // If Supabase issued a redirect (e.g. unauthenticated → /login), honor it
    if (supabaseResponse.status === 302 || supabaseResponse.status === 307) {
      return supabaseResponse;
    }

    // ── Build final response with tenant headers ──
    let finalResponse: NextResponse;

    // Platform routes: rewrite /admin → /__platform__/admin so [tenantSlug] catches it
    if (tenantSlug === '__platform__') {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = `/__platform__${pathname}`;
      console.log(`[Middleware] Platform rewrite: ${pathname} → ${rewriteUrl.pathname}`);
      finalResponse = NextResponse.rewrite(rewriteUrl, {
        request: { headers: requestHeaders },
      });
    } else {
      finalResponse = NextResponse.next({
        request: { headers: requestHeaders },
      });
    }

    // Copy auth cookies from Supabase response
    supabaseResponse.headers.getSetCookie().forEach((cookie) => {
      finalResponse.headers.append('Set-Cookie', cookie);
    });

    // Set a cookie to remember the last tenant (for backward compat redirects)
    if (tenantSlug && tenantSlug !== '__platform__') {
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
