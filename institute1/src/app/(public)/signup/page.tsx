import SignupForm from '@/features/auth/components/SignupForm';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { generateTenantBaseUrl } from '@/lib/tenant/tenantResolver';

export const metadata: Metadata = {
  title: 'Sign Up | Smart Learning',
  description: 'Join Smart Learning and start your journey.',
};

export default async function SignupPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase.from('company_settings').select('company_name, logo_url').maybeSingle();
  
  const routingMode = 'development';

  const companyName = settings?.company_name;
  const logoUrl = settings?.logo_url;
  const baseUrl = generateTenantBaseUrl(null, routingMode);

  return (
    <Suspense fallback={<div className="auth-container"><div className="auth-card" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>Loading...</div></div>}>
      <SignupForm companyName={companyName} logoUrl={logoUrl} tenantId={undefined} baseUrl={baseUrl} />
    </Suspense>
  );
}
