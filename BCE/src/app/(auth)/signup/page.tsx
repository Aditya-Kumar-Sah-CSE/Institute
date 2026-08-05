import SignupForm from '@/features/auth/components/SignupForm';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getCurrentTenant } from '@/lib/tenant';

export const metadata: Metadata = {
  title: 'Sign Up | Smart Learning',
  description: 'Join Smart Learning and start your journey.',
};

export default async function SignupPage() {
  const supabase = await createClient();
  const tenant = await getCurrentTenant();
  const { data: settings } = await supabase.from('company_settings').select('company_name, logo_url').maybeSingle();

  const companyName = tenant?.name || settings?.company_name;
  const logoUrl = tenant?.logo || settings?.logo_url;

  return <SignupForm companyName={companyName} logoUrl={logoUrl} />;
}

