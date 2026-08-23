import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { normalizeRole } from '@/lib/role-utils';
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
  // CRITICAL: Every root-level app route MUST be reserved here. If any app route
  // is missing, its first path segment gets mistaken for a tenant slug, which makes
  // the middleware treat e.g. /leaderboard as a tenant landing page and redirect
  // authenticated users back to /dashboard (production navigation bug).
  const reservedPaths = [
    'api', '_next', 'login', 'signup', 'dashboard', 'admin', 'super-admin', 'instructor',
    'apply-instructor', 'apply-institution', 'forgot-password', 'reset-password',
    // Root-level app routes (route groups (dashboard), (admin), (instructor), (public))
    'courses', 'leaderboard', 'doubts', 'notices', 'profile', 'feedbacks',
    'share-doubt', 'users', 'batch', 'certificates', 'code-arena',
    // Misc root pages
    'admission', 'pwa-start', 'contact', 'institution-not-found', 'institution-disabled',
    'privacy', 'terms',
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Public routes that don't require auth
  const publicRoutes = ['/', '/login', '/signup', '/apply-instructor', '/forgot-password', '/reset-password', '/privacy', '/terms'];
  const isPublicRoute = 
    publicRoutes.includes(pathname) || 
    (tenantSlug && pathname === `/${tenantSlug}`) ||
    pathname.startsWith('/share/') ||
    pathname.startsWith('/verify/');

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
    // let profile: { role: string; institute_id?: string | null } | null = null;
    let profile: { role: string; institute_id?: string | null } | null = null;

    // 1. Try service role client first if SUPABASE_SERVICE_ROLE_KEY is set
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const adminClient = createSupabaseAdmin(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
          { auth: { autoRefreshToken: false, persistSession: false } }
        );
        const { data, error } = await adminClient
          .from('profiles')
          
          .select('role, institute_id')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          profile = data;
        }
      } catch (err) {
        console.error('[Middleware] Admin client fetch error:', err);
      }
    }

    // 2. Fallback to standard client (works because profiles RLS allows SELECT for everyone)
    if (!profile) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role, institute_id')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          profile = data;
        } else if (error) {
          console.error('[Middleware] Anon client profile fetch error:', error);
        }
      } catch (err) {
        console.error('[Middleware] Anon client fetch exception:', err);
      }
    }
    
    if (profile) {
      userRole = normalizeRole(profile.role);
      if (profile.institute_id) {
        supabaseResponse.headers.set('x-tenant-id', profile.institute_id);
      }
    } else {
      userRole = normalizeRole(user?.user_metadata?.role) || 'student';
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
            <p>Only the Platform Owner (<code>${targetOwnerEmail}</code>) can access the Super Admin control area.</p>
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

  return supabaseResponse;
}
