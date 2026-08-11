import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

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
  const reservedPaths = ['api', '_next', 'login', 'signup', 'dashboard', 'admin', 'instructor', 'apply-instructor', 'forgot-password', 'reset-password'];
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Public routes that don't require auth
  const publicRoutes = ['/', '/login', '/signup', '/apply-instructor', '/forgot-password', '/reset-password'];
  const isPublicRoute = publicRoutes.includes(pathname) || (tenantSlug && pathname === `/${tenantSlug}`);

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
    const url = request.nextUrl.clone();
    url.pathname = tenantSlug ? `/${tenantSlug}/login` : '/login';
    return redirectWithCookies(url);
  }

  let userRole = 'student';
  if (user) {
    // Use service role client to bypass RLS — the anon-key client's auth
    // context may not have fully propagated after a token refresh, causing
    // the profile query to fail in production (Vercel).
    const adminClient = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data: profile, error } = await adminClient
      .from('profiles')
      .select('role, institution_id')
      .eq('id', user.id)
      .single();
      
    if (error) {
      console.error('[Middleware] Profile fetch error:', error);
    }
    
    if (profile) {
      userRole = profile.role;
      if (profile.institution_id) {
        supabaseResponse.headers.set('x-tenant-id', profile.institution_id);
      }
    } else {
      userRole = user?.user_metadata?.role || 'student';
      console.warn('[Middleware] Profile not found, fallback to metadata role:', userRole);
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

  // Admin route protection
  if (user && pathname.startsWith('/admin')) {
    if (userRole !== 'admin' && userRole !== 'developer') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return redirectWithCookies(url);
    }
  }

  // Instructor route protection
  if (user && pathname.startsWith('/instructor') && pathname !== '/apply-instructor') {
    if (userRole !== 'instructor' && userRole !== 'admin' && userRole !== 'developer') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return redirectWithCookies(url);
    }
  }

  return supabaseResponse;
}

