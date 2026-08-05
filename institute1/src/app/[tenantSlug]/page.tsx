import { getTenantConfig } from '@/lib/tenant/tenantResolver';
import { resolveTenantCache } from '@/lib/tenant/tenantCache';
import InstitutionLanding from '@/components/landing/InstitutionLanding';
import '@/components/landing/InstitutionLanding.css';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

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

  const supabase = await createClient();
  const { data: settings } = await supabase.from('company_settings').select('company_name').single();
  const companyName = settings?.company_name || 'Smart Learn AI';

  return <InstitutionLanding tenant={tenant} routingMode="development" companyName={companyName} />;
}
