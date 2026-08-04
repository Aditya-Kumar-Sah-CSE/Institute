import ForgotPasswordForm from '@/features/auth/components/ForgotPasswordForm';
import type { Metadata } from 'next';
import { getTenantConfig, generateTenantBaseUrl } from '@/lib/tenant/tenantResolver';

export const metadata: Metadata = {
  title: 'Forgot Password | Smart Learning',
  description: 'Reset your password for Smart Learning.',
};

export default async function ForgotPasswordPage({ tenantOverride }: { tenantOverride?: any }) {
  let tenant = tenantOverride;
  let routingMode = 'root';
  if (!tenant) {
    const config = await getTenantConfig();
    tenant = config.tenant;
    routingMode = config.routingMode;
  } else {
    routingMode = 'development';
  }

  const baseUrl = generateTenantBaseUrl(tenant?.slug || null, routingMode);

  return <ForgotPasswordForm baseUrl={baseUrl} />;
}
