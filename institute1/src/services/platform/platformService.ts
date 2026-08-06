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
}
