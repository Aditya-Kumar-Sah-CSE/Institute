export function normalizeRole(role?: unknown): string {
  if (typeof role === 'string') {
    return role.trim().toLowerCase();
  }
  return String(role || '').trim().toLowerCase();
}

export function isSuperAdminRole(role?: unknown): boolean {
  const normalized = normalizeRole(role);
  return (
    normalized === 'super_admin' ||
    normalized === 'superadmin' ||
    normalized === 'platform_owner' ||
    normalized === 'root_admin'
  );
}

export function isAdminRole(role?: unknown): boolean {
  const normalized = normalizeRole(role);
  return isSuperAdminRole(normalized) || normalized === 'admin' || normalized === 'developer';
}

export function isInstructorRole(role?: unknown): boolean {
  const normalized = normalizeRole(role);
  return isSuperAdminRole(normalized) || normalized === 'instructor' || normalized === 'admin' || normalized === 'developer' || normalized === 'faculty' || normalized === 'teacher';
}

export function canCreateLearningContent(role?: unknown, status?: unknown): boolean {
  const normalizedStatus = normalizeRole(status || 'active');
  return normalizedStatus === 'active' && isInstructorRole(role);
}
