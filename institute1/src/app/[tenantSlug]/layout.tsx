import { notFound } from 'next/navigation';
import { resolveTenantCache } from '@/lib/tenant/tenantCache';
import { TenantProvider } from '@/lib/tenant/TenantProvider';
import { generateTenantBaseUrl } from '@/lib/tenant/tenantResolver';

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  // Resolve the tenant from DB (or virtual platform tenant)
  const tenant = await resolveTenantCache(tenantSlug, 'development');

  if (!tenant) {
    notFound();
  }

  // Phase 5: Platform tenant uses empty baseUrl to keep browser URLs clean (e.g. /dashboard, not /__platform__/dashboard)
  const isPlatform = tenantSlug === '__platform__' || (tenant as any)?.is_platform;
  const routingMode = isPlatform ? 'platform' : 'development';
  const baseUrl = isPlatform ? '' : generateTenantBaseUrl(tenant?.slug || null);

  return (
    <TenantProvider tenant={tenant} routingMode={routingMode} baseUrl={baseUrl}>
      {children}
    </TenantProvider>
  );
}

