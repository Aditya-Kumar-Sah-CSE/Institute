import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { normalizeRole } from '@/lib/role-utils';

export const dynamic = 'force-dynamic';

export default async function PwaStartPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?from=pwa');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const userRole = normalizeRole(profile?.role || user.user_metadata?.role);

  if (userRole === 'instructor') {
    redirect('/instructor');
  } else if (userRole === 'admin' || userRole === 'developer' || userRole === 'super_admin' || userRole === 'superadmin') {
    redirect('/admin');
  } else {
    redirect('/dashboard');
  }
}