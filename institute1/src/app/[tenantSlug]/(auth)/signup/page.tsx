import SignupForm from '@/features/auth/components/SignupForm';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getTenantConfig, generateTenantBaseUrl } from '@/lib/tenant/tenantResolver';

export const metadata: Metadata = {
  title: 'Sign Up | Smart Learning',
  description: 'Join Smart Learning and start your journey.',
};

export default async function SignupPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase.from('company_settings').select('company_name, logo_url').maybeSingle();
  
  const { tenant, routingMode } = await getTenantConfig();

  const companyName = tenant ? `Smart Learning - ${tenant.name}` : settings?.company_name;
  const logoUrl = (tenant && tenant.logo) ? tenant.logo : settings?.logo_url;
  const baseUrl = generateTenantBaseUrl(tenant?.slug || null, routingMode);

  return (
    <Suspense fallback={<div className="auth-container"><div className="auth-card" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>Loading...</div></div>}>
      <SignupForm companyName={companyName} logoUrl={logoUrl} tenantId={tenant?.id} baseUrl={baseUrl} />
    </Suspense>
  );
}
