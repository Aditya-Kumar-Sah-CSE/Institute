import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'smartlearn.in';

// These first-segment paths are NEVER tenant slugs
const RESERVED_FIRST_SEGMENTS = new Set([
  'api', 'login', 'signup', '_next', 'favicon.ico',
  'manifest.json', 'robots.txt', 'apply-instructor',
  'institution-not-found', 'institution-disabled', 'contact', 'landing',
  'admin', 'dashboard', 'instructor', 'forgot-password', 'reset-password',
  'admission', 'pwa-start', 'apply-institution',
  'batch', 'certificates', 'courses', 'doubts', 'feedbacks',
  'leaderboard', 'notices', 'profile', 'share-doubt', 'users'
]);

function extractTenantInfo(request: NextRequest): {
  tenantSlug: string | null;
  routingMode: string;
  rewritePathname: string | null;
} {
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  // DEV / Vercel preview — path-based: /[slug]/...
  if (hostname.includes('localhost') || hostname.includes('.vercel.app')) {
    const segments = pathname.split('/'); // ['', 'bce', 'admin', ...]
    const slug = segments[1];
    if (slug && !RESERVED_FIRST_SEGMENTS.has(slug) && !slug.startsWith('_') && !slug.includes('.')) {
      const rest = segments.slice(2).join('/');
      // Only rewrite when there are sub-routes (e.g., /bce-bhagalpur/login → /login).
      // For the tenant root (/bce-bhagalpur), don't rewrite — let the catch-all route handle it.
      return {
        tenantSlug: slug,
        routingMode: 'development',
        rewritePathname: rest ? '/' + rest : null,
      };
    }
  }
  // Production wildcard — bce.smartlearn.in
  else if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    return {
      tenantSlug: hostname.replace(`.${ROOT_DOMAIN}`, ''),
      routingMode: 'wildcard',
      rewritePathname: null,
    };
  }
  // Enterprise custom domain — lms.college.edu
  else if (hostname !== ROOT_DOMAIN && !hostname.includes('localhost')) {
    return {
      tenantSlug: hostname,
      routingMode: 'custom',
      rewritePathname: null,
    };
  }

  return { tenantSlug: null, routingMode: 'root', rewritePathname: null };
}

export async function middleware(request: NextRequest) {
  try {
    const { tenantSlug, routingMode, rewritePathname } = extractTenantInfo(request);

    // 1. Build a modified request with tenant headers injected
    const requestHeaders = new Headers(request.headers);
    
    // Check if superadmin impersonation cookie exists
    const impersonatedSlug = request.cookies.get('impersonated_tenant_slug')?.value;
    const effectiveTenantSlug = impersonatedSlug || tenantSlug;

    if (effectiveTenantSlug) {
      requestHeaders.set('x-tenant-slug', effectiveTenantSlug);
      requestHeaders.set('x-routing-mode', routingMode);
      if (impersonatedSlug) {
        requestHeaders.set('x-is-impersonating', 'true');
      }
    }

    // 2. Run Supabase auth session check on the original request —
    //    but we must also pass the modified path if we're rewriting
    let authRequest = request;
    if (rewritePathname !== null) {
      // Tell Supabase the effective (rewritten) pathname for route protection logic
      const clonedUrl = request.nextUrl.clone();
      clonedUrl.pathname = rewritePathname;
      authRequest = new NextRequest(clonedUrl, {
        headers: requestHeaders,
      });
    }

    const supabaseResponse = await updateSession(authRequest);

    // 3. If Supabase issued a redirect (e.g. unauthenticated → /login), honor it
    if (supabaseResponse.status === 302 || supabaseResponse.status === 307) {
      return supabaseResponse;
    }

    // 4. If we need to rewrite the path (dev mode slug stripping), do that now
    if (rewritePathname !== null) {
      const rewriteUrl = new URL(rewritePathname, request.url);
      
      // Also inject slug as a hidden query param so Server Components can read it after rewrite
      rewriteUrl.searchParams.set('__tenant_slug', tenantSlug!);
      rewriteUrl.searchParams.set('__routing_mode', routingMode);
      
      // Copy existing search params
      request.nextUrl.searchParams.forEach((val, key) => {
        if (!rewriteUrl.searchParams.has(key)) {
          rewriteUrl.searchParams.set(key, val);
        }
      });

      const rewriteResponse = NextResponse.rewrite(rewriteUrl.toString(), {
        request: { headers: requestHeaders },
      });

      // Copy auth cookies from Supabase response
      supabaseResponse.headers.getSetCookie().forEach((cookie) => {
        rewriteResponse.headers.append('Set-Cookie', cookie);
      });

      return rewriteResponse;
    }

    // 5. No rewrite needed — return Supabase response (already has tenant + auth state)
    // But we still need to propagate our tenant headers into the next request
    const finalResponse = NextResponse.next({
      request: { headers: requestHeaders },
    });
    supabaseResponse.headers.getSetCookie().forEach((cookie) => {
      finalResponse.headers.append('Set-Cookie', cookie);
    });
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
