import { headers } from 'next/headers';
import { getPlatformInstitution } from '@/lib/platform';

export type RequestContext =
  | {
      type: 'PLATFORM';
      tenantId: string;
      tenantSlug: string;
      isPlatform: true;
    }
  | {
      type: 'TENANT';
      tenantId: string;
      tenantSlug: string;
      isPlatform: false;
    };

/**
 * Enterprise architecture core context fetcher.
 * Retrieves the context typed as either PLATFORM (Super Admin / platform users)
 * or TENANT (institution-specific users).
 *
 * Context is securely established by edge middleware and verified downstream.
 *
 * For PLATFORM context: tenantId is the Platform Institution UUID (never null).
 * Authorization decisions use isPlatform flag, NOT slug comparison.
 *
 * IMPORTANT: Callers should check `context.isPlatform` or `context.type === 'PLATFORM'`
 * to determine platform mode. Do NOT check `!context.tenantId` — it is always non-null.
 */
export async function getRequestContext(): Promise<RequestContext> {
  const headersList = await headers();
  const contextType = headersList.get('x-context-type');

  if (contextType === 'PLATFORM') {
    // Resolve platform institution via is_platform = true (cached per-request).
    // Never uses a hardcoded UUID or slug comparison for authorization.
    const platform = await getPlatformInstitution();
    return {
      type: 'PLATFORM',
      tenantId: platform.id,
      tenantSlug: platform.slug,
      isPlatform: true,
    };
  }

  // TENANT context: slug and ID injected by middleware for all tenant routes.
  const tenantId   = headersList.get('x-tenant-id')   || '';
  const tenantSlug = headersList.get('x-tenant-slug') || '';

  return {
    type: 'TENANT',
    tenantId,
    tenantSlug,
    isPlatform: false,
  };
}
