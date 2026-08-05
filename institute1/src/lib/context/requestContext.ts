import { headers } from 'next/headers';

export type RequestContext =
  | {
      type: "PLATFORM";
      tenantId: null;
      tenantSlug: null;
    }
  | {
      type: "TENANT";
      tenantId: string;
      tenantSlug: string;
    };

/**
 * Enterprise architecture core context fetcher.
 * Retrieves the context typed as either PLATFORM (Super Admin) or TENANT (Institution).
 * Context is securely established by edge middleware and verified downstream.
 */
export async function getRequestContext(): Promise<RequestContext> {
  const headersList = await headers();
  const contextType = headersList.get('x-context-type');
  
  if (contextType === 'PLATFORM') {
    return {
      type: 'PLATFORM',
      tenantId: null,
      tenantSlug: null,
    };
  }

  // Everything else defaults to TENANT if it is not explicitly PLATFORM
  // Note: tenantId might be missing initially until resolved by an inner layout or context provider,
  // but the slug is guaranteed to be injected by middleware for tenant routes.
  const tenantId = headersList.get('x-tenant-id') || '';
  const tenantSlug = headersList.get('x-tenant-slug') || '';

  return {
    type: 'TENANT',
    tenantId,
    tenantSlug,
  };
}
