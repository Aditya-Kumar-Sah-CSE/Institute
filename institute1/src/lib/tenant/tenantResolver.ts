import { headers } from 'next/headers';
import { resolveTenantCache } from './tenantCache';

export async function getTenantConfig() {
  const headersList = await headers();

  const slug =
    headersList.get('x-tenant-slug') ||
    headersList.get('x-middleware-request-x-tenant-slug') ||
    null;

  const routingMode =
    headersList.get('x-routing-mode') ||
    headersList.get('x-middleware-request-x-routing-mode') ||
    'root';

  if (!slug) {
    return { tenant: null, routingMode: 'root' };
  }

  const tenant = await resolveTenantCache(slug, routingMode);
  return { tenant, routingMode };
}

/**
 * Generate the base URL prefix for a tenant.
 * In the new architecture, the slug is ALWAYS in the path.
 */
export function generateTenantBaseUrl(slug: string | null, _routingMode?: string | null) {
  if (slug) return `/${slug}`;
  return '';
}
