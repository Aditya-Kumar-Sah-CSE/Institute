import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
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
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Tenant prefix resolution for redirects
  const tenantSlug = request.headers.get('x-tenant-slug');
  const routingMode = request.headers.get('x-routing-mode');

  let effectivePathname = pathname;
  if (routingMode === 'development' && tenantSlug && pathname.startsWith(`/${tenantSlug}`)) {
    effectivePathname = pathname.replace(`/${tenantSlug}`, '') || '/';
  }
  // Phase 4: Platform routes arrive as bare paths (e.g. /dashboard), no stripping needed
  // The middleware.ts rewrite adds __platform__ prefix internally, but supabase middleware sees the original URL

  // Public routes that don't require auth
  const publicRoutes = [
    '/', '/login', '/signup', '/forgot-password', '/reset-password',
    '/apply-instructor', '/apply-institution',
    '/institution-not-found', '/institution-disabled', '/contact', '/pwa-start',
    '/admission'
  ];
  const isPublicRoute = publicRoutes.includes(effectivePathname);

  let resolvedTenantSlug = tenantSlug;

  const getTenantUrl = (targetPath: string) => {
    const newUrl = request.nextUrl.clone();
    const activeSlug = resolvedTenantSlug || tenantSlug;
    
    // Phase 4: Platform mode — always use clean root paths, never expose __platform__
    if (routingMode === 'platform' || activeSlug === '__platform__') {
      newUrl.pathname = targetPath;
    } else if (routingMode === 'development' && activeSlug) {
      newUrl.pathname = `/${activeSlug}${targetPath}`;
    } else {
      newUrl.pathname = targetPath;
    }
    return newUrl;
  };

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
    return redirectWithCookies(getTenantUrl('/login'));
  }

  // We fetch the actual database role from profiles to prevent out-of-sync JWT metadata redirect loops.
  // Since we only do this for specific protected routes and login/signup, the DB hit is minimal.
  let userRole = 'student';
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, institution_id')
      .eq('id', user.id)
      .single();
    
    if (profile) {
      userRole = profile.role;
      
      // If we don't have a tenant slug (logged in globally) and the user has an institution, fetch its slug
      if (!resolvedTenantSlug && profile.institution_id) {
         const { data: inst } = await supabase.from('institutions').select('slug').eq('id', profile.institution_id).single();
         if (inst) resolvedTenantSlug = inst.slug;
      }
    } else {
      userRole = user?.user_metadata?.role || 'student';
    }
    
    // Explicit escape hatch: if testing locally with the super admin email, upgrade role
    if (user.email === process.env.SUPER_ADMIN_EMAIL) {
        userRole = 'super_admin';
        // Phase 4: Super admins on platform mode use clean root routes, no need to resolve a slug
        if (!resolvedTenantSlug || resolvedTenantSlug === '__platform__') {
           resolvedTenantSlug = '__platform__';
        }
    }
  }

  // If authenticated and trying to access login/signup/landing
  if (user && (effectivePathname === '/login' || effectivePathname === '/signup' || effectivePathname === '/')) {
    // Redirect based on role
    if (userRole === 'instructor') {
      return redirectWithCookies(getTenantUrl('/instructor'));
    } else if (userRole === 'admin' || userRole === 'super_admin') {
      return redirectWithCookies(getTenantUrl('/admin'));
    } else {
      return redirectWithCookies(getTenantUrl('/dashboard'));
    }
  }

  // Admin route protection
  if (user && effectivePathname.startsWith('/admin')) {
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return redirectWithCookies(getTenantUrl('/dashboard'));
    }
    
    // Strict isolation: Institute Admins cannot access Super Admin governance pages
    if (userRole === 'admin') {
      if (effectivePathname.startsWith('/admin/institutions') || 
          effectivePathname.startsWith('/admin/domain-settings') || 
          effectivePathname.startsWith('/admin/payment-model')) {
        return redirectWithCookies(getTenantUrl('/admin'));
      }
    }
  }

  // Instructor route protection
  if (user && effectivePathname.startsWith('/instructor') && effectivePathname !== '/apply-instructor') {
    if (userRole !== 'instructor' && userRole !== 'admin' && userRole !== 'super_admin') {
      return redirectWithCookies(getTenantUrl('/dashboard'));
    }
  }

  return supabaseResponse;
}
