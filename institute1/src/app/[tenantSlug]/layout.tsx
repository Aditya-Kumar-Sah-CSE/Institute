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

  // Resolve the tenant from DB
  const tenant = await resolveTenantCache(tenantSlug, 'development');

  if (!tenant) {
    notFound();
  }

  const baseUrl = generateTenantBaseUrl(tenant.slug);

  return (
    <TenantProvider tenant={tenant} routingMode="development" baseUrl={baseUrl}>
      {children}
    </TenantProvider>
  );
}
