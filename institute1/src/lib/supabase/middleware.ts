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

  // We rely on the JWT metadata for the role in middleware to avoid a massive database bottleneck.
  // The actual database role will be verified by the Server Components.
  const userRole = user?.user_metadata?.role || 'student';

  // If authenticated and trying to access login/signup/landing
  if (user && (pathname === '/login' || pathname === '/signup' || pathname === '/')) {
    const url = request.nextUrl.clone();
    // Redirect based on role
    if (userRole === 'instructor') {
      url.pathname = '/instructor';
    } else if (userRole === 'admin') {
      url.pathname = '/admin';
    } else {
      url.pathname = '/dashboard';
    }
    return redirectWithCookies(url);
  }

  // Admin route protection
  if (user && pathname.startsWith('/admin')) {
    if (userRole !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return redirectWithCookies(url);
    }
  }

  // Instructor route protection
  if (user && pathname.startsWith('/instructor') && pathname !== '/apply-instructor') {
    if (userRole !== 'instructor' && userRole !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return redirectWithCookies(url);
    }
  }

  return supabaseResponse;
}
