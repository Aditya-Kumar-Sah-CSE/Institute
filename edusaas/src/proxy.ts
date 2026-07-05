import { NextRequest, NextResponse } from 'next/server';

export default async function proxy(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  // --- Strategy 1: Subdomain-based routing ---
  // bce.edusaas.com -> tenant = 'bce'
  const hostnameWithoutPort = hostname.split(':')[0];
  const subdomain = hostnameWithoutPort.split('.')[0];
  const isSubdomainTenant = !['www', 'admin', 'api', 'edusaas', 'localhost', '127'].includes(subdomain);

  // --- Strategy 2: Path-based routing (fallback) ---
  // edusaas.com/bce/dashboard -> tenant = 'bce'
  const pathTenant = pathname.split('/')[1];

  const tenantSlug = isSubdomainTenant ? subdomain : pathTenant;

  // Skip API routes, static assets, and global marketing
  if (
    pathname.startsWith('/api') || 
    pathname.startsWith('/_next') || 
    pathname === '/favicon.ico' || 
    !tenantSlug || 
    ['admin'].includes(tenantSlug)
  ) {
    return NextResponse.next();
  }

  // Inject tenant info into request headers for downstream use
  // The actual DB lookup will occur in Server Components or API Routes
  const response = isSubdomainTenant 
    ? NextResponse.rewrite(new URL(`/${tenantSlug}${pathname === '/' ? '' : pathname}`, request.url))
    : NextResponse.next();
    
  response.headers.set('x-tenant-slug', tenantSlug);

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
