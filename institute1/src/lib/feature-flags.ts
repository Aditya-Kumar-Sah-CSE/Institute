import { createAdminClient } from '@/lib/supabase/server';

export const DEFAULT_GLOBAL_FEATURE_FLAGS = {
  personal_chat: true, group_chat: true, voice_call: true, video_call: true, leaderboard: true, student_status: true, student_innovations: true,
  coding_arena: true, coding_battles: true, problem_explorer: true, leetcode_integration: true, codeforces_integration: true, compiler: true, text_editor: true, latex_editor: true,
  contest_alerts: true, notifications: true, courses: true, polls: true, doubt_system: true, emergency_alerts: true, integrations: true, nptel: true,
  departments: true, batches: true, classes: true, organizations: true, maintenance_mode: false,
} satisfies Record<string, boolean>;
export type GlobalFeatureFlags = Record<keyof typeof DEFAULT_GLOBAL_FEATURE_FLAGS, boolean>;
export type EmergencyKillSwitches = { disable_all_chat: boolean; disable_video_calls: boolean; disable_coding_arena: boolean; disable_external_integrations: boolean; disable_contest_alerts: boolean; enable_maintenance_mode: boolean };
export const DEFAULT_EMERGENCY_KILL_SWITCHES: EmergencyKillSwitches = { disable_all_chat: false, disable_video_calls: false, disable_coding_arena: false, disable_external_integrations: false, disable_contest_alerts: false, enable_maintenance_mode: false };

export async function getGlobalFeatureFlags(): Promise<GlobalFeatureFlags> {
  const db = await createAdminClient(); const { data } = await db.from('global_feature_flags').select('key,enabled');
  const flags: Record<string, boolean> = { ...DEFAULT_GLOBAL_FEATURE_FLAGS };
  for (const row of data || []) if (row.key in flags) flags[row.key] = row.enabled;
  return flags as GlobalFeatureFlags;
}
export async function getEmergencyKillSwitches(): Promise<EmergencyKillSwitches> { return DEFAULT_EMERGENCY_KILL_SWITCHES; }
export async function updateGlobalFeatureFlags(updates: Partial<GlobalFeatureFlags>, updatedBy?: string): Promise<GlobalFeatureFlags> {
  const db = await createAdminClient(); const entries = Object.entries(updates).filter(([key, value]) => key in DEFAULT_GLOBAL_FEATURE_FLAGS && typeof value === 'boolean').map(([key, enabled]) => ({ key, enabled, updated_by: updatedBy, updated_at: new Date().toISOString() }));
  if (entries.length) { const { error } = await db.from('global_feature_flags').upsert(entries, { onConflict: 'key' }); if (error) throw new Error(`Could not persist feature flags: ${error.message}`); }
  return getGlobalFeatureFlags();
}
export async function updateEmergencyKillSwitches(updates: Partial<EmergencyKillSwitches>): Promise<EmergencyKillSwitches> {
  const map: Record<string, Partial<GlobalFeatureFlags>> = {
    disable_all_chat: { personal_chat: false, group_chat: false }, disable_video_calls: { video_call: false }, disable_coding_arena: { coding_arena: false, coding_battles: false }, disable_external_integrations: { integrations: false, leetcode_integration: false, codeforces_integration: false }, disable_contest_alerts: { contest_alerts: false }, enable_maintenance_mode: { maintenance_mode: true },
  };
  const overrides = Object.entries(updates).filter(([, value]) => value).reduce((all, [key]) => ({ ...all, ...(map[key] || {}) }), {});
  if (Object.keys(overrides).length) await updateGlobalFeatureFlags(overrides);
  return { ...DEFAULT_EMERGENCY_KILL_SWITCHES, ...updates };
}
export async function isFeatureAllowed(featureName: keyof GlobalFeatureFlags, adminPreference?: boolean | null, rolePermission?: boolean | null, userPermission?: boolean | null, userEmail?: string | null, userRole?: string | null): Promise<boolean> {
  const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || 'iambestadi@gmail.com').toLowerCase();
  if (userEmail?.trim().toLowerCase() === superAdminEmail || userRole === 'super_admin' || userRole === 'platform_owner') return true;
  const flags = await getGlobalFeatureFlags();
  return flags[featureName] !== false && adminPreference !== false && rolePermission !== false && userPermission !== false;
}
