/**
 * lib/platform-auth.ts
 *
 * Dedicated Platform Auth Helper.
 * Checks the `public.platform_users` table to authenticate Control Plane users.
 * Completely isolated from tenant profiles.
 */

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { SUPER_ADMIN_EMAIL } from '@/lib/constants';
import { cache } from 'react';

export type PlatformRole = 'SUPER_ADMIN' | 'PLATFORM_ADMIN' | 'SUPPORT' | 'BILLING_ADMIN';

export type PlatformUser = {
  id: string;
  email: string;
  platformRole: PlatformRole;
  created_at: string;
};

/**
 * Resolves current authenticated Platform User from `public.platform_users`.
 * Fallback to SUPER_ADMIN_EMAIL for root administrator.
 * Cached per-request via React cache().
 */
export const getPlatformUser = cache(async (): Promise<PlatformUser | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Query dedicated platform_users table using admin client
  const adminSb = await createAdminClient();
  const { data: platformUser } = await adminSb
    .from('platform_users')
    .select('id, role, created_at')
    .eq('id', user.id)
    .maybeSingle();

  if (platformUser) {
    return {
      id: user.id,
      email: user.email || '',
      platformRole: platformUser.role as PlatformRole,
      created_at: platformUser.created_at || new Date().toISOString(),
    };
  }

  // Fallback for Super Admin email
  if (user.email === SUPER_ADMIN_EMAIL) {
    return {
      id: user.id,
      email: user.email,
      platformRole: 'SUPER_ADMIN',
      created_at: new Date().toISOString(),
    };
  }

  return null;
});
