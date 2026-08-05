import ForgotPasswordForm from '@/features/auth/components/ForgotPasswordForm';
import type { Metadata } from 'next';
import { getTenantConfig, generateTenantBaseUrl } from '@/lib/tenant/tenantResolver';

export const metadata: Metadata = {
  title: 'Forgot Password | Smart Learning',
  description: 'Reset your password for Smart Learning.',
};

export default async function ForgotPasswordPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const { resolveTenantCache } = await import('@/lib/tenant/tenantCache');
  const tenant = await resolveTenantCache(tenantSlug, 'development');
  const routingMode = 'development';

  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  const { data: settings } = await supabase.from('company_settings').select('company_name, logo_url').maybeSingle();

  const companyName = tenant ? `Smart Learning - ${tenant.name}` : settings?.company_name;
  const logoUrl = (tenant && tenant.logo) ? tenant.logo : settings?.logo_url;
  const baseUrl = generateTenantBaseUrl(tenant?.slug || null, routingMode);

  return <ForgotPasswordForm baseUrl={baseUrl} companyName={companyName} logoUrl={logoUrl} />;
}
