import { requireSuperAdmin } from '@/lib/super-admin';
import { getAuditLogs } from '@/lib/audit-logger';
import { successResponse, withSafeApiHandler } from '@/lib/api-response';

export const GET = withSafeApiHandler(async () => {
  await requireSuperAdmin();
  return successResponse({ logs: getAuditLogs() });
});
