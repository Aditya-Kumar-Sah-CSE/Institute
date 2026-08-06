/**
 * lib/platform-auth.ts
 *
 * Dedicated Platform Auth Helper.
 * Checks the `public.platform_users` table to authenticate Control Plane users.
 * Completely isolated from tenant profiles.
 */

import { createClient, createAdminClient } from '@/lib/supabase/server';
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
 * Returns null if unauthenticated or if user is not a Platform User.
 * Cached per-request via React cache().
 */
export const getPlatformUser = cache(async (): Promise<PlatformUser | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Query dedicated platform_users table using admin client
  const adminSb = await createAdminClient();
  const { data: platformUser, error } = await adminSb
    .from('platform_users')
    .select('id, role, created_at')
    .eq('id', user.id)
    .single();

  if (error || !platformUser) {
    return null;
  }

  return {
    id: user.id,
    email: user.email || '',
    platformRole: platformUser.role as PlatformRole,
    created_at: platformUser.created_at,
  };
});
