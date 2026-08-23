import { requireSuperAdmin, SUPER_ADMIN_EMAIL } from '@/lib/super-admin';
import { createAdminClient } from '@/lib/supabase/server';
import { getGlobalFeatureFlags, getEmergencyKillSwitches } from '@/lib/feature-flags';
import { getAuditLogs } from '@/lib/audit-logger';
import { successResponse, withSafeApiHandler } from '@/lib/api-response';

export const GET = withSafeApiHandler(async () => {
  const admin = await requireSuperAdmin();

  let stats = {
    totalUsers: 0,
    totalAdmins: 0,
    totalFaculty: 0,
    totalStudents: 0,
    activeTenants: 1,
  };

  try {
    const adminSupabase = await createAdminClient();
    const { data: users } = await adminSupabase.from('profiles').select('role');
    
    if (users) {
      stats.totalUsers = users.length;
      stats.totalAdmins = users.filter((u: any) => u.role === 'admin' || u.role === 'super_admin').length;
      stats.totalFaculty = users.filter((u: any) => u.role === 'instructor' || u.role === 'faculty').length;
      stats.totalStudents = users.filter((u: any) => u.role === 'student' || !u.role).length;
    }
  } catch (err: any) {
    console.warn('[SUPER_ADMIN_STATS_WARN]', err.message);
  }

  return successResponse({
    owner: {
      email: SUPER_ADMIN_EMAIL,
      role: 'super_admin',
      isImmutable: true,
      authenticatedAs: admin.email,
    },
    stats,
    featureFlags: await getGlobalFeatureFlags(),
    emergencyKillSwitches: await getEmergencyKillSwitches(),
    recentAuditLogs: getAuditLogs().slice(0, 10),
  });
});
