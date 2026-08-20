import { normalizeRole } from './role-utils';

export const SUPER_ADMIN_EMAIL = 'iambestadi@gmail.com';
export const SUPER_ADMIN_ROLE = 'super_admin';

export interface UserAuthContext {
  id?: string;
  email?: string | null;
  role?: string | null;
  [key: string]: any;
}

/**
 * Server-side authorization check for Super Admin.
 * Verifies BOTH email === 'iambestadi@gmail.com' AND role === 'super_admin'.
 */
export function isSuperAdmin(user?: UserAuthContext | null): boolean {
  if (!user || !user.email) return false;
  const normalizedEmail = user.email.trim().toLowerCase();
  return normalizedEmail === SUPER_ADMIN_EMAIL.toLowerCase();
}

/**
 * Checks if an email address belongs to the immutable platform owner.
 */
export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}

/**
 * Immutability Guard: Asserts that a target account is NOT the Super Admin.
 * Throws a 403 error if an operation attempts to modify, demote, suspend, or delete iambestadi@gmail.com.
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
    // Only the existing Super Admin caller can manage super admin privileges, but even then, there is only one immutable owner.
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
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    const err: any = new Error('Authentication required.');
    err.status = 401;
    err.code = 'UNAUTHENTICATED';
    throw err;
  }

  if (!isSuperAdmin({ email: user.email })) {
    const err: any = new Error('Super Admin access required. Only the Platform Owner can access this resource.');
    err.status = 403;
    err.code = 'FORBIDDEN_SUPER_ADMIN_ONLY';
    throw err;
  }

  return {
    user,
    email: user.email!,
    id: user.id,
  };
}
