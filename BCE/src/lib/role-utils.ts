export function normalizeRole(role?: unknown): string {
  if (typeof role === 'string') {
    return role.trim().toLowerCase();
  }
  return String(role || '').trim().toLowerCase();
}

export function isAdminRole(role?: unknown): boolean {
  const normalized = normalizeRole(role);
  return normalized === 'admin' || normalized === 'developer';
}

export function isInstructorRole(role?: unknown): boolean {
  const normalized = normalizeRole(role);
  return normalized === 'instructor' || normalized === 'admin' || normalized === 'developer';
}
