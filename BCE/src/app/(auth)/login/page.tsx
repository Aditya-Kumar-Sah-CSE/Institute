import LoginForm from '@/features/auth/components/LoginForm';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getCurrentTenant } from '@/lib/tenant';

export const metadata: Metadata = {
  title: 'Login | Smart Learning',
  description: 'Sign in to Smart Learning and continue your journey.',
};

export default async function LoginPage() {
  const supabase = await createClient();
  const tenant = await getCurrentTenant();
  const { data: settings } = await supabase.from('company_settings').select('company_name, logo_url').maybeSingle();

  const companyName = tenant?.name || settings?.company_name;
  const logoUrl = tenant?.logo || settings?.logo_url;

  return (
    <Suspense fallback={<div className="auth-container"><div className="auth-card" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>Loading...</div></div>}>
      <LoginForm companyName={companyName} logoUrl={logoUrl} />
    </Suspense>
  );
}


