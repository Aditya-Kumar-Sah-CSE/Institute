import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateProfile } from '@/lib/profile';
import { normalizeRole } from '@/lib/role-utils';

export const ADMIN_ROLES = ['admin', 'developer'] as const;
export const INSTRUCTOR_ROLES = ['instructor', 'admin', 'developer'] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];
export type InstructorRole = (typeof INSTRUCTOR_ROLES)[number];

export interface AuthProfileResult {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: any;
  profile: any;
}

export async function getAuthorizedProfile(options?: {
  allowedRoles?: readonly string[];
  onUnauthenticated?: string;
  onUnauthorized?: string;
}): Promise<AuthProfileResult> {
  const {
    allowedRoles = [],
    onUnauthenticated = '/login',
    onUnauthorized = '/dashboard',
  } = options || {};

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(onUnauthenticated);
  }

  const profile = await getOrCreateProfile(user);

  if (!profile) {
    return { supabase, user, profile: null };
  }

  const normalizedRole = normalizeRole(profile.role);

  if (allowedRoles.length > 0 && !allowedRoles.map(normalizeRole).includes(normalizedRole)) {
    redirect(onUnauthorized);
  }

  return { supabase, user, profile };
}
