import LoginForm from '@/features/auth/components/LoginForm';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { generateTenantBaseUrl } from '@/lib/tenant/tenantResolver';

export const metadata: Metadata = {
  title: 'Login | Smart Learning',
  description: 'Sign in to Smart Learning and continue your journey.',
};

export default async function LoginPage() {
  let companyName: string | undefined;
  let logoUrl: string | undefined;
  try {
    const supabase = await createClient();
    const { data: settings } = await supabase
      .from('company_settings')
      .select('company_name, logo_url')
      .maybeSingle();
    companyName = settings?.company_name ?? undefined;
    logoUrl = settings?.logo_url ?? undefined;
  } catch {
    // Fall back to defaults so the login form still renders
  }

  const baseUrl = generateTenantBaseUrl(null, 'root');

  return (
    <Suspense fallback={<div className="auth-container"><div className="auth-card" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>Loading...</div></div>}>
      <LoginForm companyName={companyName} logoUrl={logoUrl} baseUrl={baseUrl} />
    </Suspense>
  );
}
