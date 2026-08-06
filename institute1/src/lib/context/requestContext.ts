import { headers } from 'next/headers';
import { getPlatformInstitution } from '@/lib/platform';

export type RequestContext =
  | {
      type: 'CONTROL_PLANE';
      isControlPlane: true;
      isPlatform: false;
      userId: string | null;
      role: string | null;
      permissions: string[];
    }
  | {
      type: 'PLATFORM';
      tenantId: string;
      tenantSlug: string;
      isPlatform: true;
      isControlPlane: false;
      userId: string | null;
      role: string | null;
      permissions: string[];
    }
  | {
      type: 'TENANT';
      tenantId: string;
      tenantSlug: string;
      isPlatform: false;
      isControlPlane: false;
      userId: string | null;
      role: string | null;
      permissions: string[];
    };

/**
 * Enterprise architecture core context fetcher.
 * Retrieves the context typed as CONTROL_PLANE, PLATFORM, or TENANT.
 */
export async function getRequestContext(): Promise<RequestContext> {
  const headersList = await headers();
  const contextType = headersList.get('x-context-type');
  const userId = headersList.get('x-user-id') || null;
  const role = headersList.get('x-user-role') || null;
  const permissionsStr = headersList.get('x-user-permissions') || '';
  const permissions = permissionsStr ? permissionsStr.split(',').filter(Boolean) : [];

  if (contextType === 'CONTROL_PLANE') {
    return Object.freeze({
      type: 'CONTROL_PLANE',
      isControlPlane: true,
      isPlatform: false,
      userId,
      role,
      permissions,
    });
  }

  if (contextType === 'PLATFORM') {
    const platform = await getPlatformInstitution();
    return Object.freeze({
      type: 'PLATFORM',
      tenantId: platform.id,
      tenantSlug: platform.slug,
      isPlatform: true,
      isControlPlane: false,
      userId,
      role,
      permissions,
    });
  }

  const tenantId   = headersList.get('x-tenant-id')   || '';
  const tenantSlug = headersList.get('x-tenant-slug') || '';

  return Object.freeze({
    type: 'TENANT',
    tenantId,
    tenantSlug,
    isPlatform: false,
    isControlPlane: false,
    userId,
    role,
    permissions,
  });
}
