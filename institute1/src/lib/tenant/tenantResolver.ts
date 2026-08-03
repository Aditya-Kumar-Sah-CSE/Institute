import { headers } from 'next/headers';
import { resolveTenantCache } from './tenantCache';

export async function getTenantConfig() {
  const headersList = await headers();

  // After NextResponse.rewrite(), Next.js exposes injected request headers under:
  //   1. The original header name (works in wildcard/custom domain modes — no rewrite)
  //   2. x-middleware-request-[name] prefix (present after path rewrites in dev/Vercel)
  const slug =
    headersList.get('x-tenant-slug') ||
    headersList.get('x-middleware-request-x-tenant-slug') ||
    null;

  const routingMode =
    headersList.get('x-routing-mode') ||
    headersList.get('x-middleware-request-x-routing-mode') ||
    'root';

  if (!slug || routingMode === 'root') {
    return { tenant: null, routingMode: 'root' };
  }

  const tenant = await resolveTenantCache(slug, routingMode);
  return { tenant, routingMode };
}

export function generateTenantBaseUrl(slug: string | null, routingMode: string | null) {
  if (routingMode === 'development' && slug) return `/${slug}`;
  return '';
}
