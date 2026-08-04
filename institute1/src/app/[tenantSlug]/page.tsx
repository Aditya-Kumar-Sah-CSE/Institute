import { getTenantConfig } from '@/lib/tenant/tenantResolver';
import { resolveTenantCache } from '@/lib/tenant/tenantCache';
import InstitutionLanding from '@/components/landing/InstitutionLanding';
import '@/components/landing/InstitutionLanding.css';
import { notFound } from 'next/navigation';

export default async function TenantHomePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  const tenant = await resolveTenantCache(tenantSlug, 'development');

  if (!tenant) {
    notFound();
  }

  return <InstitutionLanding tenant={tenant} routingMode="development" />;
}
