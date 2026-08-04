import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'smartlearn.in';

// Paths that live at the TRUE root (no tenant slug)
const ROOT_ONLY_PATHS = new Set([
  'api', '_next', 'favicon.ico', 'manifest.json', 'robots.txt',
  'apply-institution', 'apply-instructor',
  'institution-not-found', 'institution-disabled',
  'contact', 'pwa-start',
]);

// Legacy bare routes that USED to live at root but now require a tenant
const LEGACY_TENANT_ROUTES = new Set([
  'admin', 'dashboard', 'instructor',
  'courses', 'doubts', 'notices', 'leaderboard',
  'profile', 'feedbacks', 'share-doubt', 'users',
  'batch', 'certificates', 'login', 'signup',
  'forgot-password', 'reset-password',
]);

function isStaticAsset(pathname: string): boolean {
  return /\.(?:svg|png|jpg|jpeg|gif|webp|json|ico|js|css|woff2?)$/i.test(pathname);
}

export async function middleware(request: NextRequest) {
  try {
    const hostname = request.headers.get('host') || '';
    const pathname = request.nextUrl.pathname;

    // Skip static assets
    if (isStaticAsset(pathname) || pathname.startsWith('/_next')) {
      return NextResponse.next();
    }

    const segments = pathname.split('/').filter(Boolean); // ['bce-bhagalpur', 'admin', 'courses']
    const firstSegment = segments[0] || '';

    // ── Determine tenant slug ──
    let tenantSlug: string | null = null;
    let routingMode = 'root';

    if (hostname.includes('localhost') || hostname.includes('.vercel.app')) {
      // Path-based tenancy: /[tenantSlug]/...
      if (firstSegment && !ROOT_ONLY_PATHS.has(firstSegment) && !LEGACY_TENANT_ROUTES.has(firstSegment) && !firstSegment.startsWith('_') && !firstSegment.includes('.')) {
        tenantSlug = firstSegment;
        routingMode = 'development';
      }
    } else if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
      tenantSlug = hostname.replace(`.${ROOT_DOMAIN}`, '');
      routingMode = 'wildcard';
    } else if (hostname !== ROOT_DOMAIN && !hostname.includes('localhost')) {
      tenantSlug = hostname;
      routingMode = 'custom';
    }

    // ── Backward compatibility: redirect bare legacy routes ──
    if (!tenantSlug && LEGACY_TENANT_ROUTES.has(firstSegment)) {
      // Try to infer tenant from cookie
      const lastTenant = request.cookies.get('last_tenant_slug')?.value;
      if (lastTenant) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = `/${lastTenant}${pathname}`;
        return NextResponse.redirect(redirectUrl, 302);
      }
      // No tenant can be inferred — redirect to institution-not-found for auth pages
      // or to root for others
      if (['login', 'signup', 'forgot-password', 'reset-password'].includes(firstSegment)) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = '/institution-not-found';
        return NextResponse.redirect(redirectUrl, 302);
      }
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
    const finalResponse = NextResponse.next({
      request: { headers: requestHeaders },
    });

    // Copy auth cookies from Supabase response
    supabaseResponse.headers.getSetCookie().forEach((cookie) => {
      finalResponse.headers.append('Set-Cookie', cookie);
    });

    // Set a cookie to remember the last tenant (for backward compat redirects)
    if (tenantSlug) {
      finalResponse.cookies.set('last_tenant_slug', tenantSlug, {
        path: '/',
        httpOnly: false,
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    return finalResponse;
  } catch (err: any) {
    return NextResponse.json({ error: String(err), stack: err.stack, customMiddlewareError: true }, { status: 500 });
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json)$).*)',
  ],
};
