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
    '/admission', '/privacy', '/terms'
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
  // LOOP PREVENTION: if the computed redirect URL equals the current URL,
  // return next() instead of a 302 to break any /login → /login cycle.
  const redirectWithCookies = (url: URL) => {
    // Detect self-redirect: same pathname, same hostname
    if (url.pathname === pathname && url.hostname === request.nextUrl.hostname) {
      return supabaseResponse; // just pass through
    }
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

  let userRole = 'student';
  let userId = '';
  let userPermissions: string[] = [];

  if (user) {
    userId = user.id;

    // Check platform_users first to see if this is a platform administrator/support staff
    const { data: platformUser } = await supabase
      .from('platform_users')
      .select('role, is_active, status')
      .eq('id', user.id)
      .maybeSingle();

    if (platformUser) {
      if (!platformUser.is_active || platformUser.status !== 'active') {
        userRole = 'suspended';
      } else {
        userRole = platformUser.role;
        userPermissions = [platformUser.role];
      }
    } else {
      // Fallback to standard tenant profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, institution_id')
        .eq('id', user.id)
        .maybeSingle();
      
      if (profile) {
        userRole = profile.role;
        userPermissions = [profile.role];
        
        // If we don't have a tenant slug (logged in globally) and the user has an institution, fetch its slug
        if (!resolvedTenantSlug && profile.institution_id) {
           const { data: inst } = await supabase
             .from('institutions')
             .select('slug')
             .eq('id', profile.institution_id)
             .maybeSingle();
           if (inst) {
             resolvedTenantSlug = inst.slug;
           }
        }

        if (profile.institution_id) {
           // Load tenant features for permissions / access control
           const { data: feats } = await supabase
             .from('tenant_features')
             .select('feature_key')
             .eq('institution_id', profile.institution_id)
             .eq('is_enabled', true);
           if (feats) {
             userPermissions.push(...feats.map(f => f.feature_key));
           }
        }
      } else {
        userRole = user?.user_metadata?.role || 'student';
        userPermissions = [userRole];
      }
      
      // Explicit escape hatch: if testing locally with the super admin email, upgrade role
      if (user.email === process.env.SUPER_ADMIN_EMAIL) {
          userRole = 'super_admin';
          userPermissions = ['super_admin'];
          // Phase 4: Super admins on platform mode use clean root routes, no need to resolve a slug
          if (!resolvedTenantSlug || resolvedTenantSlug === '__platform__') {
             resolvedTenantSlug = '__platform__';
          }
      }
    }

    // Set immutable user context headers
    request.headers.set('x-user-id', userId);
    request.headers.set('x-user-role', userRole);
    request.headers.set('x-user-permissions', userPermissions.join(','));
  }

  // If authenticated but platform user account is suspended, redirect to login
  if (user && userRole === 'suspended' && !isPublicRoute) {
    return redirectWithCookies(getTenantUrl('/login?error=suspended'));
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
