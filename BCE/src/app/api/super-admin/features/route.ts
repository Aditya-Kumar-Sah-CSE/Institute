import { requireSuperAdmin } from '@/lib/super-admin';
import {
  getGlobalFeatureFlags,
  getEmergencyKillSwitches,
  updateGlobalFeatureFlags,
  updateEmergencyKillSwitches,
} from '@/lib/feature-flags';
import { logAuditAction } from '@/lib/audit-logger';
import { successResponse, errorResponse, withSafeApiHandler } from '@/lib/api-response';

export const GET = withSafeApiHandler(async () => {
  await requireSuperAdmin();

  return successResponse({
    featureFlags: getGlobalFeatureFlags(),
    emergencyKillSwitches: getEmergencyKillSwitches(),
  });
});

export const POST = withSafeApiHandler(async (request: Request) => {
  const admin = await requireSuperAdmin();

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body in request', 'BAD_REQUEST', 400);
  }

  const { featureFlags, emergencyKillSwitches } = body;

  const oldFlags = getGlobalFeatureFlags();
  const oldEmergency = getEmergencyKillSwitches();

  let updatedFlags = oldFlags;
  let updatedEmergency = oldEmergency;

  if (featureFlags && typeof featureFlags === 'object') {
    updatedFlags = updateGlobalFeatureFlags(featureFlags);
    await logAuditAction({
      actorId: admin.id,
      actorEmail: admin.email,
      action: 'UPDATE_GLOBAL_FEATURE_FLAGS',
      target: 'Global Feature Engine',
      oldValue: oldFlags,
      newValue: updatedFlags,
    });
  }

  if (emergencyKillSwitches && typeof emergencyKillSwitches === 'object') {
    updatedEmergency = updateEmergencyKillSwitches(emergencyKillSwitches);
    await logAuditAction({
      actorId: admin.id,
      actorEmail: admin.email,
      action: 'TOGGLE_EMERGENCY_KILL_SWITCH',
      target: 'Emergency Control System',
      oldValue: oldEmergency,
      newValue: updatedEmergency,
    });
  }

  return successResponse({
    featureFlags: updatedFlags,
    emergencyKillSwitches: updatedEmergency,
  }, 'Feature flags updated successfully');
});
