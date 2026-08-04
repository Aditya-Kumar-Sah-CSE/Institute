import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { SUPER_ADMIN_EMAIL } from '@/lib/constants';
import AdminInstitutionsClient from './AdminInstitutionsClient';

export default async function InstitutionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user?.email !== SUPER_ADMIN_EMAIL) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <h2>Unauthorized</h2>
        <p>This module is strictly restricted to Super Admin access.</p>
      </div>
    );
  }

  // Use the admin client to bypass any restrictive RLS that we might not have set up yet for superadmins correctly
  // Usually, superadmin uses the service role key for some bootstrapping tasks.
  const { createClient: createAdminClient } = await import('@supabase/supabase-js');
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const [{ data: requests }, { data: institutions }] = await Promise.all([
    supabaseAdmin.from('institution_requests').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('institutions').select('*').order('created_at', { ascending: false })
  ]);

  return <AdminInstitutionsClient requests={requests || []} institutions={institutions || []} />;
}
