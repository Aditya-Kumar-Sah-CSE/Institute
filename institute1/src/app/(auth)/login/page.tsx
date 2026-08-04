import LoginForm from '@/features/auth/components/LoginForm';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getTenantConfig, generateTenantBaseUrl } from '@/lib/tenant/tenantResolver';

export const metadata: Metadata = {
  title: 'Login | Smart Learning',
  description: 'Sign in to Smart Learning and continue your journey.',
};

export default async function LoginPage({ tenantOverride }: { tenantOverride?: any }) {
  const supabase = await createClient();
  const { data: settings } = await supabase.from('company_settings').select('company_name, logo_url').maybeSingle();
  
  let tenant = tenantOverride;
  let routingMode = 'root';
  if (!tenant) {
    const config = await getTenantConfig();
    tenant = config.tenant;
    routingMode = config.routingMode;
  } else {
    // If tenant passed as override, we know it's a subpath in development
    routingMode = 'development';
  }

  const companyName = tenant ? tenant.name : settings?.company_name;
  const logoUrl = settings?.logo_url;
  const baseUrl = generateTenantBaseUrl(tenant?.slug || null, routingMode);

  return (
    <Suspense fallback={<div className="auth-container"><div className="auth-card" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>Loading...</div></div>}>
      <LoginForm companyName={companyName} logoUrl={logoUrl} baseUrl={baseUrl} />
    </Suspense>
  );
}
