import { headers } from 'next/headers';
import { getPlatformInstitution } from '@/lib/platform';

export type RequestContext =
  | {
      type: 'CONTROL_PLANE';
      isControlPlane: true;
      isPlatform: false;
    }
  | {
      type: 'PLATFORM';
      tenantId: string;
      tenantSlug: string;
      isPlatform: true;
      isControlPlane: false;
    }
  | {
      type: 'TENANT';
      tenantId: string;
      tenantSlug: string;
      isPlatform: false;
      isControlPlane: false;
    };

/**
 * Enterprise architecture core context fetcher.
 * Retrieves the context typed as CONTROL_PLANE, PLATFORM, or TENANT.
 */
export async function getRequestContext(): Promise<RequestContext> {
  const headersList = await headers();
  const contextType = headersList.get('x-context-type');

  if (contextType === 'CONTROL_PLANE') {
    return {
      type: 'CONTROL_PLANE',
      isControlPlane: true,
      isPlatform: false,
    };
  }

  if (contextType === 'PLATFORM') {
    const platform = await getPlatformInstitution();
    return {
      type: 'PLATFORM',
      tenantId: platform.id,
      tenantSlug: platform.slug,
      isPlatform: true,
      isControlPlane: false,
    };
  }

  const tenantId   = headersList.get('x-tenant-id')   || '';
  const tenantSlug = headersList.get('x-tenant-slug') || '';

  return {
    type: 'TENANT',
    tenantId,
    tenantSlug,
    isPlatform: false,
    isControlPlane: false,
  };
}
