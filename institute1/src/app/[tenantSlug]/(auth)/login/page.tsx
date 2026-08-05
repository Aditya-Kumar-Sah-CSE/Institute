import LoginForm from '@/features/auth/components/LoginForm';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { generateTenantBaseUrl } from '@/lib/tenant/tenantResolver';
import { resolveTenantCache } from '@/lib/tenant/tenantCache';

export const metadata: Metadata = {
  title: 'Login | Smart Learning',
  description: 'Sign in to Smart Learning and continue your journey.',
};

export default async function LoginPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const supabase = await createClient();
  const { data: settings } = await supabase.from('company_settings').select('company_name, logo_url').maybeSingle();
  
  const tenant = await resolveTenantCache(tenantSlug, 'development');
  const routingMode = 'development'; // defaulting to development for local auth paths if needed

  const companyName = tenant ? tenant.name : settings?.company_name;
  const logoUrl = (tenant && tenant.logo) ? tenant.logo : settings?.logo_url;
  const baseUrl = generateTenantBaseUrl(tenant?.slug || null, routingMode);

  return (
    <Suspense fallback={<div className="auth-container"><div className="auth-card" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>Loading...</div></div>}>
      <LoginForm companyName={companyName} logoUrl={logoUrl} baseUrl={baseUrl} />
    </Suspense>
  );
}
