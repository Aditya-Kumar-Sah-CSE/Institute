import { normalizeRole } from './role-utils';

export const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'iambestadi@gmail.com';
export const SUPER_ADMIN_ROLE = 'super_admin';

export interface UserAuthContext {
  id?: string;
  email?: string | null;
  role?: string | null;
  [key: string]: any;
}

/**
 * Server-side authorization check for Super Admin.
 * Verifies email matches SUPER_ADMIN_EMAIL OR user has super_admin / platform_owner role.
 */
export function isSuperAdmin(user?: UserAuthContext | null): boolean {
  if (!user) return false;
  const targetEmail = (process.env.SUPER_ADMIN_EMAIL || SUPER_ADMIN_EMAIL).trim().toLowerCase();
  const normalizedEmail = user.email ? user.email.trim().toLowerCase() : '';
  const normalizedRole = normalizeRole(user.role);

  if (normalizedEmail && normalizedEmail === targetEmail) return true;
  if (normalizedRole === 'super_admin' || normalizedRole === 'superadmin' || normalizedRole === 'platform_owner') return true;

  return false;
}

/**
 * Checks if an email address belongs to the immutable platform owner.
 */
export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const targetEmail = (process.env.SUPER_ADMIN_EMAIL || SUPER_ADMIN_EMAIL).trim().toLowerCase();
  return email.trim().toLowerCase() === targetEmail;
}

/**
 * Immutability Guard: Asserts that a target account is NOT the Super Admin.
 * Throws a 403 error if an operation attempts to modify, demote, suspend, or delete the platform owner.
 */
export function assertNotSuperAdminTarget(targetEmail?: string | null, actionDescription = 'modify'): void {
  if (isSuperAdminEmail(targetEmail)) {
    const error: any = new Error('Only the Platform Owner can modify this account.');
    error.status = 403;
    error.code = 'FORBIDDEN_SUPER_ADMIN_IMMUTABLE';
    throw error;
  }
}

/**
 * Role Escalation Guard: Prevents assigning SUPER_ADMIN role through normal UI/API operations.
 */
export function canAssignRole(callerUser: UserAuthContext | null, targetRole: string): boolean {
  const normalizedTargetRole = normalizeRole(targetRole);
  if (normalizedTargetRole === SUPER_ADMIN_ROLE || normalizedTargetRole === 'superadmin') {
    // Only the existing Super Admin caller can manage super admin privileges.
    return isSuperAdmin(callerUser);
  }
  return true;
}

/**
 * Returns a standardized Super Admin metadata object.
 */
export function getSuperAdminMetadata() {
  return {
    email: SUPER_ADMIN_EMAIL,
    role: SUPER_ADMIN_ROLE,
    title: 'Platform Owner & Root Admin',
    isImmutable: true,
  };
}

/**
 * Server-side security guard that enforces Super Admin authorization for server actions and API routes.
 * Throws a formatted error object with status 401/403 if unauthorized.
 */
export async function requireSuperAdmin() {
  const { createClient, createAdminClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    const err: any = new Error('Authentication required.');
    err.status = 401;
    err.code = 'UNAUTHENTICATED';
    throw err;
  }

  let userRole = normalizeRole(user.user_metadata?.role);

  try {
    const adminSupabase = await createAdminClient();
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role) {
      userRole = normalizeRole(profile.role);
    }
  } catch (e) {
    console.warn('[requireSuperAdmin] Could not query profiles table for user role:', e);
  }

  if (!isSuperAdmin({ email: user.email, role: userRole })) {
    const err: any = new Error('Super Admin access required. Only the Platform Owner can access this resource.');
    err.status = 403;
    err.code = 'FORBIDDEN_SUPER_ADMIN_ONLY';
    throw err;
  }

  return {
    user,
    email: user.email!,
    id: user.id,
    role: userRole,
  };
}
