import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'smartlearn.in';

// These first-segment paths are NEVER tenant slugs
const RESERVED_FIRST_SEGMENTS = new Set([
  'api', 'login', 'signup', '_next', 'favicon.ico',
  'manifest.json', 'robots.txt', 'apply-instructor',
  'institution-not-found', 'institution-disabled', 'contact', 'landing',
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
      return {
        tenantSlug: slug,
        routingMode: 'development',
        rewritePathname: '/' + rest,
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
  const { tenantSlug, routingMode, rewritePathname } = extractTenantInfo(request);

  // 1. Build a modified request with tenant headers injected
  const requestHeaders = new Headers(request.headers);
  if (tenantSlug) {
    requestHeaders.set('x-tenant-slug', tenantSlug);
    requestHeaders.set('x-routing-mode', routingMode);
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
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = rewritePathname;
    // Also inject slug as a hidden query param so Server Components can read it after rewrite
    rewriteUrl.searchParams.set('__tenant_slug', tenantSlug!);
    rewriteUrl.searchParams.set('__routing_mode', routingMode);

    const rewriteResponse = NextResponse.rewrite(rewriteUrl, {
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
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json)$).*)',
  ],
};
