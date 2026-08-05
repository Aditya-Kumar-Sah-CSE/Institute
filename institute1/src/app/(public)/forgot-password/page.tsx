import ForgotPasswordForm from '@/features/auth/components/ForgotPasswordForm';
import type { Metadata } from 'next';
import { generateTenantBaseUrl } from '@/lib/tenant/tenantResolver';

export const metadata: Metadata = {
  title: 'Forgot Password | Smart Learning',
  description: 'Reset your password for Smart Learning.',
};

export default async function ForgotPasswordPage() {
  const routingMode = 'development';
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  const { data: settings } = await supabase.from('company_settings').select('company_name, logo_url').maybeSingle();

  const companyName = settings?.company_name;
  const logoUrl = settings?.logo_url;
  const baseUrl = generateTenantBaseUrl(null, routingMode);

  return <ForgotPasswordForm baseUrl={baseUrl} companyName={companyName} logoUrl={logoUrl} />;
}
