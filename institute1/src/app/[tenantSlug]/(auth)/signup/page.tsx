import SignupForm from '@/features/auth/components/SignupForm';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { generateTenantBaseUrl } from '@/lib/tenant/tenantResolver';
import { resolveTenantCache } from '@/lib/tenant/tenantCache';

export const metadata: Metadata = {
  title: 'Sign Up | Smart Learning',
  description: 'Join Smart Learning and start your journey.',
};

export default async function SignupPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const supabase = await createClient();
  const { data: settings } = await supabase.from('company_settings').select('company_name, logo_url').maybeSingle();
  
  const tenant = await resolveTenantCache(tenantSlug, 'development');
  const routingMode = 'development';

  const companyName = tenant ? tenant.name : settings?.company_name;
  const logoUrl = (tenant && tenant.logo) ? tenant.logo : settings?.logo_url;
  const baseUrl = generateTenantBaseUrl(tenant?.slug || null, routingMode);

  return (
    <Suspense fallback={<div className="auth-container"><div className="auth-card" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>Loading...</div></div>}>
      <SignupForm companyName={companyName} logoUrl={logoUrl} tenantId={tenant?.id} baseUrl={baseUrl} />
    </Suspense>
  );
}
