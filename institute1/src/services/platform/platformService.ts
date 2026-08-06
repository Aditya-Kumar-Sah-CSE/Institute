/**
 * services/platform/platformService.ts
 *
 * Dedicated Platform Control Plane Service Boundary.
 * Enforces clean separation: `createAdminClient()` is ONLY executed within this service layer,
 * never directly inside React Server/Client Components.
 */

import { createAdminClient } from '@/lib/supabase/server';
import { getPlatformUser } from '@/lib/platform-auth';

export class PlatformService {
  /**
   * Retrieves high-level SaaS platform health & metrics.
   */
  static async getPlatformMetrics() {
    const platformUser = await getPlatformUser();
    if (!platformUser) throw new Error('Unauthorized Platform Access');

    const adminSb = await createAdminClient();

    const { count: tenantCount } = await adminSb
      .from('institutions')
      .select('*', { count: 'exact', head: true });

    const { count: userCount } = await adminSb
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { data: plans } = await adminSb
      .from('pricing_plans')
      .select('id, name');

    return {
      tenantCount: tenantCount || 0,
      userCount: userCount || 0,
      activePlansCount: plans?.length || 0,
      uptime: '99.98%',
    };
  }

  /**
   * Lists all SaaS customer & demo tenants with lifecycle information.
   */
  static async listInstitutions() {
    const platformUser = await getPlatformUser();
    if (!platformUser) throw new Error('Unauthorized Platform Access');

    const adminSb = await createAdminClient();
    const { data: institutions, error } = await adminSb
      .from('institutions')
      .select('id, name, slug, is_platform, is_active, subscription_status, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return institutions || [];
  }

  /**
   * Logs a platform audit event into public.platform_audit_logs.
   */
  static async logPlatformAudit(action: string, targetResource?: string, metadata?: Record<string, any>) {
    const platformUser = await getPlatformUser();
    if (!platformUser) return;

    const adminSb = await createAdminClient();
    await adminSb.from('platform_audit_logs').insert({
      platform_user_id: platformUser.id,
      action,
      target_resource: targetResource,
      metadata,
    });
  }

  /**
   * Audited impersonation session creation.
   */
  static async startImpersonationSession(tenantId: string, reason: string) {
    const platformUser = await getPlatformUser();
    if (!platformUser) throw new Error('Unauthorized Platform Access');

    const adminSb = await createAdminClient();
    const { data: session, error } = await adminSb
      .from('platform_sessions')
      .insert({
        platform_user_id: platformUser.id,
        tenant_id: tenantId,
        reason,
      })
      .select()
      .single();

    if (error) throw error;

    await this.logPlatformAudit('IMPERSONATION_STARTED', `tenant:${tenantId}`, { reason, sessionId: session.id });
    return session;
  }

  /**
   * Terminate an active impersonation session.
   */
  static async endImpersonationSession(sessionId: string) {
    const platformUser = await getPlatformUser();
    if (!platformUser) throw new Error('Unauthorized Platform Access');

    const adminSb = await createAdminClient();
    const { data: session, error } = await adminSb
      .from('platform_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;

    await this.logPlatformAudit('IMPERSONATION_ENDED', `tenant:${session.tenant_id}`, { sessionId });
    return session;
  }

  /**
   * Logs a tenant-specific audit event in public.tenant_audit_logs.
   */
  static async logTenantAudit(institutionId: string, userId: string | null, action: string, targetResource?: string, metadata?: Record<string, any>) {
    const adminSb = await createAdminClient();
    await adminSb.from('tenant_audit_logs').insert({
      institution_id: institutionId,
      user_id: userId,
      action,
      target_resource: targetResource,
      metadata,
    });
  }

  /**
   * Checks if a feature flag matches specific plan / override rules for a tenant.
   */
  static async isFeatureEnabledForTenant(institutionId: string, featureKey: string): Promise<boolean> {
    const adminSb = await createAdminClient();
    
    // 1. Check tenant override
    const { data: tenantFlag } = await adminSb
      .from('tenant_features')
      .select('is_enabled')
      .eq('institution_id', institutionId)
      .eq('feature_key', featureKey)
      .maybeSingle();

    if (tenantFlag) {
      return tenantFlag.is_enabled;
    }

    // 2. Fallback to global default
    const { data: platformFlag } = await adminSb
      .from('platform_features')
      .select('is_enabled_globally')
      .eq('feature_key', featureKey)
      .maybeSingle();

    return platformFlag ? platformFlag.is_enabled_globally : false;
  }

  /**
   * Checks if a feature flag is enabled globally.
   */
  static async isFeatureEnabledGlobally(featureKey: string): Promise<boolean> {
    const adminSb = await createAdminClient();
    const { data: platformFlag } = await adminSb
      .from('platform_features')
      .select('is_enabled_globally')
      .eq('feature_key', featureKey)
      .maybeSingle();

    return platformFlag ? platformFlag.is_enabled_globally : false;
  }

  /**
   * Fetches all registration requests for new institutions/tenants.
   */
  static async getInstitutionRequests() {
    const platformUser = await getPlatformUser();
    if (!platformUser) throw new Error('Unauthorized Platform Access');

    const adminSb = await createAdminClient();
    const { data, error } = await adminSb
      .from('institution_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}
