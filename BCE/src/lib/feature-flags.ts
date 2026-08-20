import fs from 'fs';
import path from 'path';

export interface GlobalFeatureFlags {
  // Communication
  personal_chat: boolean;
  group_chat: boolean;
  voice_call: boolean;
  video_call: boolean;
  // Student & Feed
  leaderboard: boolean;
  student_status: boolean;
  student_innovations: boolean;
  // Coding Arena
  coding_arena: boolean;
  coding_battles: boolean;
  problem_explorer: boolean;
  leetcode_integration: boolean;
  codeforces_integration: boolean;
  compiler: boolean;
  text_editor: boolean;
  latex_editor: boolean;
  // Learning & Alerts
  contest_alerts: boolean;
  notifications: boolean;
  courses: boolean;
  polls: boolean;
  doubt_system: boolean;
  emergency_alerts: boolean;
  // System Structure
  departments: boolean;
  batches: boolean;
  classes: boolean;
  organizations: boolean;
  // Maintenance & System
  maintenance_mode: boolean;
}

export interface EmergencyKillSwitches {
  disable_all_chat: boolean;
  disable_video_calls: boolean;
  disable_coding_arena: boolean;
  disable_external_integrations: boolean;
  disable_contest_alerts: boolean;
  enable_maintenance_mode: boolean;
}

export const DEFAULT_GLOBAL_FEATURE_FLAGS: GlobalFeatureFlags = {
  personal_chat: true,
  group_chat: true,
  voice_call: true,
  video_call: true,
  leaderboard: true,
  student_status: true,
  student_innovations: true,
  coding_arena: true,
  coding_battles: true,
  problem_explorer: true,
  leetcode_integration: true,
  codeforces_integration: true,
  compiler: true,
  text_editor: true,
  latex_editor: true,
  contest_alerts: true,
  notifications: true,
  courses: true,
  polls: true,
  doubt_system: true,
  emergency_alerts: true,
  departments: true,
  batches: true,
  classes: true,
  organizations: true,
  maintenance_mode: false,
};

export const DEFAULT_EMERGENCY_KILL_SWITCHES: EmergencyKillSwitches = {
  disable_all_chat: false,
  disable_video_calls: false,
  disable_coding_arena: false,
  disable_external_integrations: false,
  disable_contest_alerts: false,
  enable_maintenance_mode: false,
};

// Persistence helper file path
const STORE_PATH = path.join(process.cwd(), 'src', 'lib', 'feature-flags-store.json');

function loadPersistedFlags(): { flags: GlobalFeatureFlags; emergency: EmergencyKillSwitches } {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const content = fs.readFileSync(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      return {
        flags: { ...DEFAULT_GLOBAL_FEATURE_FLAGS, ...(parsed.flags || {}) },
        emergency: { ...DEFAULT_EMERGENCY_KILL_SWITCHES, ...(parsed.emergency || {}) },
      };
    }
  } catch (err) {
    console.warn('[FEATURE_FLAGS_PERSIST_WARN]', err);
  }
  return {
    flags: { ...DEFAULT_GLOBAL_FEATURE_FLAGS },
    emergency: { ...DEFAULT_EMERGENCY_KILL_SWITCHES },
  };
}

function persistFlags(flags: GlobalFeatureFlags, emergency: EmergencyKillSwitches) {
  try {
    const data = JSON.stringify({ flags, emergency, updatedAt: new Date().toISOString() }, null, 2);
    fs.writeFileSync(STORE_PATH, data, 'utf-8');
  } catch (err) {
    console.warn('[FEATURE_FLAGS_WRITE_WARN]', err);
  }
}

let { flags: inMemoryGlobalFlags, emergency: inMemoryEmergencySwitches } = loadPersistedFlags();

export function getGlobalFeatureFlags(): GlobalFeatureFlags {
  const loaded = loadPersistedFlags();
  inMemoryGlobalFlags = loaded.flags;
  return { ...inMemoryGlobalFlags };
}

export function getEmergencyKillSwitches(): EmergencyKillSwitches {
  const loaded = loadPersistedFlags();
  inMemoryEmergencySwitches = loaded.emergency;
  return { ...inMemoryEmergencySwitches };
}

export function updateGlobalFeatureFlags(updates: Partial<GlobalFeatureFlags>): GlobalFeatureFlags {
  const current = loadPersistedFlags();
  inMemoryGlobalFlags = { ...current.flags, ...updates };
  inMemoryEmergencySwitches = { ...current.emergency };

  // Sync maintenance mode with emergency kill switches
  if (typeof updates.maintenance_mode === 'boolean') {
    inMemoryEmergencySwitches.enable_maintenance_mode = updates.maintenance_mode;
  }
  if (typeof updates.video_call === 'boolean' && !updates.video_call) {
    inMemoryEmergencySwitches.disable_video_calls = true;
  }
  if (typeof updates.coding_arena === 'boolean' && !updates.coding_arena) {
    inMemoryEmergencySwitches.disable_coding_arena = true;
  }

  persistFlags(inMemoryGlobalFlags, inMemoryEmergencySwitches);
  return getGlobalFeatureFlags();
}

export function updateEmergencyKillSwitches(updates: Partial<EmergencyKillSwitches>): EmergencyKillSwitches {
  const current = loadPersistedFlags();
  inMemoryGlobalFlags = { ...current.flags };
  inMemoryEmergencySwitches = { ...current.emergency, ...updates };

  // Reflect emergency kill switches back to global feature flags
  if (updates.disable_all_chat) {
    inMemoryGlobalFlags.personal_chat = false;
    inMemoryGlobalFlags.group_chat = false;
  }
  if (updates.disable_video_calls) {
    inMemoryGlobalFlags.video_call = false;
  }
  if (updates.disable_coding_arena) {
    inMemoryGlobalFlags.coding_arena = false;
    inMemoryGlobalFlags.coding_battles = false;
  }
  if (updates.disable_external_integrations) {
    inMemoryGlobalFlags.leetcode_integration = false;
    inMemoryGlobalFlags.codeforces_integration = false;
  }
  if (updates.disable_contest_alerts) {
    inMemoryGlobalFlags.contest_alerts = false;
  }
  if (typeof updates.enable_maintenance_mode === 'boolean') {
    inMemoryGlobalFlags.maintenance_mode = updates.enable_maintenance_mode;
  }

  persistFlags(inMemoryGlobalFlags, inMemoryEmergencySwitches);
  return getEmergencyKillSwitches();
}

/**
 * Global Feature Control Priority Engine
 * SUPER ADMIN GLOBAL CONTROL -> ADMIN FEATURE CONTROL -> ROLE PERMISSION -> USER PERMISSION -> FEATURE ACCESS
 */
export function isFeatureAllowed(
  featureName: keyof GlobalFeatureFlags,
  adminPreference?: boolean | null,
  rolePermission?: boolean | null,
  userPermission?: boolean | null,
  userEmail?: string | null,
  userRole?: string | null
): boolean {
  // Super Admin Immunity Check: Super Admin can still view/access features for testing
  const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || 'iambestadi@gmail.com').toLowerCase();
  if (userEmail && userEmail.trim().toLowerCase() === superAdminEmail) {
    return true;
  }
  if (userRole && (userRole === 'super_admin' || userRole === 'platform_owner')) {
    return true;
  }

  const loaded = loadPersistedFlags();
  const globalFlags = loaded.flags;
  const emergency = loaded.emergency;

  // 1. Super Admin Global Control (Highest Priority)
  const superAdminFlag = globalFlags[featureName];
  if (superAdminFlag === false) {
    return false;
  }

  // Check emergency kill switches
  if (emergency.enable_maintenance_mode && featureName !== 'maintenance_mode') {
    return false;
  }
  if (emergency.disable_all_chat && (featureName === 'personal_chat' || featureName === 'group_chat')) {
    return false;
  }
  if (emergency.disable_video_calls && featureName === 'video_call') {
    return false;
  }
  if (emergency.disable_coding_arena && (featureName === 'coding_arena' || featureName === 'coding_battles')) {
    return false;
  }
  if (emergency.disable_external_integrations && (featureName === 'leetcode_integration' || featureName === 'codeforces_integration')) {
    return false;
  }
  if (emergency.disable_contest_alerts && featureName === 'contest_alerts') {
    return false;
  }

  // 2. Admin Feature Control
  if (adminPreference === false) {
    return false;
  }

  // 3. Role Permission
  if (rolePermission === false) {
    return false;
  }

  // 4. User Permission
  if (userPermission === false) {
    return false;
  }

  return true;
}
