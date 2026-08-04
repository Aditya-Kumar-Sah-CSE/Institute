import { headers, cookies } from 'next/headers';
import { getTenantConfig } from './tenantResolver';

export interface TenantContextType {
  tenantId: string | null;
  tenantSlug: string | null;
  tenantName: string | null;
  isImpersonating: boolean;
  routingMode: string;
}

export async function getTenantContext(): Promise<TenantContextType> {
  const headersList = await headers();
  const cookieStore = await cookies();

  const isImpersonating = headersList.get('x-is-impersonating') === 'true' || !!cookieStore.get('impersonated_tenant_id')?.value;
  const impersonatedId = cookieStore.get('impersonated_tenant_id')?.value || null;
  const impersonatedName = cookieStore.get('impersonated_tenant_name')?.value || null;
  const impersonatedSlug = cookieStore.get('impersonated_tenant_slug')?.value || null;

  const { tenant, routingMode } = await getTenantConfig();

  if (isImpersonating && impersonatedId) {
    return {
      tenantId: impersonatedId,
      tenantSlug: impersonatedSlug || tenant?.slug || null,
      tenantName: impersonatedName || tenant?.name || null,
      isImpersonating: true,
      routingMode,
    };
  }

  return {
    tenantId: tenant?.id || null,
    tenantSlug: tenant?.slug || null,
    tenantName: tenant?.name || null,
    isImpersonating: false,
    routingMode,
  };
}

/**
 * Utility function to enforce institution_id filter in database queries
 */
export function scopeQuery<T extends Record<string, any>>(query: T, institutionId: string | null): T {
  if (!institutionId) return query;
  return {
    ...query,
    institution_id: institutionId,
  };
}
