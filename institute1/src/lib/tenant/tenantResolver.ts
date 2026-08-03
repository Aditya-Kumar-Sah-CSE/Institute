import { headers } from 'next/headers';
import { resolveTenantCache } from './tenantCache';

export async function getTenantConfig() {
  const headersList = await headers();
  
  // Primary: read from injected request headers
  let slug = headersList.get('x-tenant-slug');
  let routingMode = headersList.get('x-routing-mode') || 'root';

  // Fallback: middleware also injects slug as a hidden URL search param during dev rewrites
  // This ensures Server Components can always read tenant context
  if (!slug) {
    const url = headersList.get('x-forwarded-for-url') || '';  // not reliable
    // Use the dedicated header the middleware sets directly
    slug = headersList.get('x-middleware-request-x-tenant-slug') || null;
    routingMode = headersList.get('x-middleware-request-x-routing-mode') || 'root';
  }

  if (!slug || routingMode === 'root') {
    return { tenant: null, routingMode: 'root' };
  }

  const tenant = await resolveTenantCache(slug as string, routingMode as string);
  return { tenant, routingMode };
}

export function generateTenantBaseUrl(slug: string | null, routingMode: string | null) {
  if (routingMode === 'development' && slug) return `/${slug}`;
  return '';
}
