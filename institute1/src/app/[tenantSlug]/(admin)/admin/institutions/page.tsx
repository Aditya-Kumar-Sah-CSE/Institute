import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { SUPER_ADMIN_EMAIL } from '@/lib/constants';
import { PlatformService } from '@/services/platform/platformService';
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

  const [requests, institutions] = await Promise.all([
    PlatformService.getInstitutionRequests(),
    PlatformService.listInstitutions()
  ]);

  return <AdminInstitutionsClient requests={requests} institutions={institutions} />;
}
