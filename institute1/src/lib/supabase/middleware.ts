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

  // Public routes that don't require auth
  const publicRoutes = ['/', '/login', '/signup', '/apply-instructor'];
  const isPublicRoute = publicRoutes.includes(effectivePathname);

  const getTenantUrl = (targetPath: string) => {
    const newUrl = request.nextUrl.clone();
    // Only prefix in development mode (e.g. localhost:3000/bce-bhagalpur)
    if (routingMode === 'development' && tenantSlug) {
      newUrl.pathname = `/${tenantSlug}${targetPath}`;
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
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profile) {
      userRole = profile.role;
    } else {
      userRole = user?.user_metadata?.role || 'student';
    }
    
    // Explicit escape hatch: if testing locally with the super admin email, upgrade role
    if (user.email === process.env.SUPER_ADMIN_EMAIL) {
        userRole = 'super_admin';
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
