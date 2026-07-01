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

  // Public routes that don't require auth
  const publicRoutes = ['/', '/login', '/signup', '/apply-instructor'];
  const isPublicRoute = publicRoutes.includes(pathname);

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
    url.pathname = '/login';
    return redirectWithCookies(url);
  }

  // We only need to fetch the profile for role-based redirects or protecting admin/instructor routes
  const needsProfileCheck = 
    pathname === '/login' || 
    pathname === '/signup' || 
    pathname === '/' ||
    pathname.startsWith('/admin') || 
    pathname.startsWith('/instructor') ||
    pathname.startsWith('/apply-');

  let profile = null;
  if (user && needsProfileCheck) {
    const { data } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single();
    profile = data;
  }

  // If authenticated and trying to access login/signup/landing
  if (user && (pathname === '/login' || pathname === '/signup' || pathname === '/')) {
    const url = request.nextUrl.clone();
    // Redirect based on role and status
    if (profile?.role === 'instructor') {
      url.pathname = '/instructor';
    } else if (profile?.role === 'admin') {
      url.pathname = '/admin';
    } else {
      url.pathname = '/dashboard';
    }
    return redirectWithCookies(url);
  }

  // (Instructor pending status check removed: pending applicants are now just 'student' role)
  // (Admin status check removed since there's no admin application process)

  // Admin route protection
  if (user && pathname.startsWith('/admin')) {
    if (!profile || profile.role !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return redirectWithCookies(url);
    }
  }

  // Instructor route protection
  if (user && pathname.startsWith('/instructor') && pathname !== '/apply-instructor') {
    if (!profile || (profile.role !== 'instructor' && profile.role !== 'admin')) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return redirectWithCookies(url);
    }
  }

  return supabaseResponse;
}
