import { createAdminClient } from '@/lib/supabase/server';
import { cache } from 'react';

export type PlanTier = 'STARTER' | 'PRO' | 'ENTERPRISE';

export type FeatureKey =
  | 'CODING_ARENA'
  | 'CODING_BATTLE'
  | 'TEAM_BATTLE'
  | 'POLLS'
  | 'DOUBT_SYSTEM'
  | 'EMERGENCY_ALERT'
  | 'LEADERBOARD'
  | 'ADVANCED_ANALYTICS'
  | 'AI_MENTOR'
  | 'CERTIFICATES';

export const PLAN_DEFAULTS: Record<PlanTier, Record<FeatureKey, boolean>> = {
  STARTER: {
    CODING_ARENA: false,
    CODING_BATTLE: false,
    TEAM_BATTLE: false,
    POLLS: true,
    DOUBT_SYSTEM: true,
    EMERGENCY_ALERT: false,
    LEADERBOARD: true,
    ADVANCED_ANALYTICS: false,
    AI_MENTOR: false,
    CERTIFICATES: true,
  },
  PRO: {
    CODING_ARENA: true,
    CODING_BATTLE: true,
    TEAM_BATTLE: true,
    POLLS: true,
    DOUBT_SYSTEM: true,
    EMERGENCY_ALERT: true,
    LEADERBOARD: true,
    ADVANCED_ANALYTICS: false,
    AI_MENTOR: false,
    CERTIFICATES: true,
  },
  ENTERPRISE: {
    CODING_ARENA: true,
    CODING_BATTLE: true,
    TEAM_BATTLE: true,
    POLLS: true,
    DOUBT_SYSTEM: true,
    EMERGENCY_ALERT: true,
    LEADERBOARD: true,
    ADVANCED_ANALYTICS: true,
    AI_MENTOR: true,
    CERTIFICATES: true,
  },
};

export interface TenantEntitlements {
  institutionId: string;
  planTier: PlanTier;
  maxStudents: number;
  maxFaculty: number;
  features: Record<FeatureKey, boolean>;
}

/**
 * Fetch and resolve complete feature entitlements for an institution.
 * Memoized per request using React cache().
 */
export const getTenantEntitlements = cache(
  async (institutionId: string): Promise<TenantEntitlements | null> => {
    if (!institutionId) return null;

    try {
      const supabaseAdmin = await createAdminClient();
      const { data: inst } = await supabaseAdmin
        .from('institutions')
        .select('id, is_platform, plan_tier, max_students, max_faculty, feature_flags')
        .eq('id', institutionId)
        .maybeSingle();

      if (!inst) return null;

      // Platform Tenant has all features enabled & infinite limits
      if (inst.is_platform) {
        const allEnabled = Object.keys(PLAN_DEFAULTS.ENTERPRISE).reduce((acc, key) => {
          acc[key as FeatureKey] = true;
          return acc;
        }, {} as Record<FeatureKey, boolean>);

        return {
          institutionId: inst.id,
          planTier: 'ENTERPRISE',
          maxStudents: 999999,
          maxFaculty: 999999,
          features: allEnabled,
        };
      }

      const planTier: PlanTier = (inst.plan_tier as PlanTier) || 'PRO';
      const defaults = PLAN_DEFAULTS[planTier] || PLAN_DEFAULTS.PRO;
      const overrides: Record<string, boolean> = inst.feature_flags || {};

      // Merge defaults + per-tenant overrides
      const features = { ...defaults };
      Object.keys(overrides).forEach((key) => {
        if (key in features) {
          features[key as FeatureKey] = Boolean(overrides[key]);
        }
      });

      return {
        institutionId: inst.id,
        planTier,
        maxStudents: inst.max_students ?? 5000,
        maxFaculty: inst.max_faculty ?? 250,
        features,
      };
    } catch (err) {
      console.error('[Entitlements] Error resolving tenant entitlements:', err);
      return null;
    }
  }
);

/**
 * Check if a specific institution has access to a feature.
 */
export async function hasFeature(institutionId: string, featureKey: FeatureKey): Promise<boolean> {
  const entitlements = await getTenantEntitlements(institutionId);
  if (!entitlements) return false;
  return entitlements.features[featureKey] ?? false;
}

/**
 * Check if an institution has reached its student seat limit.
 */
export async function checkStudentSeatAvailable(institutionId: string): Promise<{ available: boolean; current: number; max: number }> {
  const entitlements = await getTenantEntitlements(institutionId);
  const max = entitlements?.maxStudents ?? 5000;

  const supabaseAdmin = await createAdminClient();
  const { count } = await supabaseAdmin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'student')
    .eq('institution_id', institutionId);

  const current = count || 0;
  return { available: current < max, current, max };
}

/**
 * Check if an institution has reached its faculty seat limit.
 */
export async function checkFacultySeatAvailable(institutionId: string): Promise<{ available: boolean; current: number; max: number }> {
  const entitlements = await getTenantEntitlements(institutionId);
  const max = entitlements?.maxFaculty ?? 250;

  const supabaseAdmin = await createAdminClient();
  const { count } = await supabaseAdmin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'instructor')
    .eq('institution_id', institutionId);

  const current = count || 0;
  return { available: current < max, current, max };
}
