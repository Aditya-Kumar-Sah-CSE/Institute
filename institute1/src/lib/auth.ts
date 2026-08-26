import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateProfile } from '@/lib/profile';
import { normalizeRole } from '@/lib/role-utils';
import { isSuperAdmin } from '@/lib/super-admin';

export const SUPER_ADMIN_ROLES = ['super_admin', 'superadmin', 'platform_owner', 'root_admin'] as const;
export const ADMIN_ROLES = ['super_admin', 'admin', 'developer'] as const;
export const INSTRUCTOR_ROLES = ['super_admin', 'instructor', 'admin', 'developer'] as const;

export type SuperAdminRole = (typeof SUPER_ADMIN_ROLES)[number];
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

  // If user is Super Admin (iambestadi@gmail.com + super_admin role), grant access to all protected admin/instructor routes
  if (isSuperAdmin({ email: user.email, role: profile.role })) {
    return { supabase, user, profile };
  }

  if (allowedRoles.length > 0 && !allowedRoles.map(normalizeRole).includes(normalizedRole)) {
    redirect(onUnauthorized);
  }

  return { supabase, user, profile };
}
